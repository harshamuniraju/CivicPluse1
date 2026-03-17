const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());
app.use(cors());
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const DATASET_PATH = path.join(__dirname, 'data', 'dataset_complaints.json');

function loadDatasetComplaints() {
  try {
    if (!fs.existsSync(DATASET_PATH)) return [];
    const raw = fs.readFileSync(DATASET_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load dataset complaints:', err.message || err);
    return [];
  }
}

const datasetComplaints = loadDatasetComplaints();

function buildOptions(records) {
  const cityWardMap = {};
  const categorySet = new Set();

  records.forEach((r) => {
    const city = (r.City_or_District || '').trim();
    const area = (r.Area || '').trim();
    const category = (r.Category || '').trim();
    if (!city) return;

    if (!cityWardMap[city]) cityWardMap[city] = new Set();
    if (area) cityWardMap[city].add(area);
    if (category) categorySet.add(category);
  });

  const cityOptions = Object.keys(cityWardMap).sort();
  const wardByCity = {};
  cityOptions.forEach((city) => {
    wardByCity[city] = Array.from(cityWardMap[city]).sort((a, b) => {
      const na = parseInt(String(a).replace(/\D+/g, ''), 10);
      const nb = parseInt(String(b).replace(/\D+/g, ''), 10);
      if (Number.isNaN(na) || Number.isNaN(nb)) return String(a).localeCompare(String(b));
      return na - nb;
    });
  });

  return {
    cityOptions,
    wardByCity,
    categoryOptions: Array.from(categorySet).sort()
  };
}

const datasetOptions = buildOptions(datasetComplaints);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/civicpulse';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true }).then(() => {
  console.log('MongoDB connected');
}).catch(err => console.error('MongoDB connection error', err));

const ComplaintSchema = new mongoose.Schema({
  text: { type: String, required: true },
  City_or_District: { type: String, default: '' },
  Area: { type: String, default: '' },
  Category: { type: String, default: '' },
  sentiment: { type: Number, default: null },
  status: {
    type: String,
    enum: ['yet_to_be_solved', 'in_progress', 'resolved'],
    default: 'yet_to_be_solved'
  },
  createdAt: { type: Date, default: Date.now }
});
const Complaint = mongoose.model('Complaint', ComplaintSchema);

function normalizeSentiment(prediction) {
  if (prediction === null || prediction === undefined) return null;

  if (typeof prediction === 'string') {
    const p = prediction.trim().toLowerCase();
    if (p === 'positive' || p === 'pos' || p === '1') return 1;
    if (p === 'negative' || p === 'neg' || p === '0' || p === '-1') return 0;
    if (p === 'neutral' || p === 'neu' || p === 'natural' || p === '2') return 2;
    return null;
  }

  const p = Number(prediction);
  if (!Number.isFinite(p)) return null;
  if (p === 1) return 1;
  if (p === 0 || p === -1) return 0;
  if (p === 2) return 2;
  return null;
}

async function createComplaint(req, res) {
  const { text, City_or_District = '', Area = '', Category = '' } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });
  try {
    const mlUrl = process.env.ML_API || 'http://localhost:8001/predict';
    let sentiment = null;
    try {
      const mlResp = await axios.post(mlUrl, { text }, { timeout: 4000 });
      sentiment = normalizeSentiment(mlResp.data && mlResp.data.prediction != null ? mlResp.data.prediction : null);
    } catch (mlErr) {
      console.warn('ML API unavailable, saving complaint without sentiment:', mlErr.message || mlErr);
    }
    const doc = await Complaint.create({ text, City_or_District, Area, Category, sentiment });
    io.emit('new-complaint', doc);
    return res.status(201).json(doc);
  } catch (err) {
    console.error(err.message || err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
}

async function listComplaints(req, res) {
  const docs = await Complaint.find().sort({ createdAt: -1 }).limit(5000).lean();
  const combined = [...docs, ...datasetComplaints];
  combined.sort((a, b) => {
    const ta = Date.parse(a.createdAt || 0) || 0;
    const tb = Date.parse(b.createdAt || 0) || 0;
    return tb - ta;
  });
  res.json(combined);
}

async function listAdminComplaints(req, res) {
  try {
    const docs = await Complaint.find().sort({ createdAt: -1 }).limit(5000).lean();
    return res.json(docs);
  } catch (err) {
    console.error(err.message || err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
}

async function updateComplaintStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body || {};
  const allowedStatuses = new Set(['yet_to_be_solved', 'in_progress', 'resolved']);

  if (!allowedStatuses.has(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const updated = await Complaint.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ error: 'Complaint not found' });

    io.emit('complaint-updated', updated);
    return res.json(updated);
  } catch (err) {
    console.error(err.message || err);
    return res.status(500).json({ error: err.message || 'server error' });
  }
}

app.post('/complaints', createComplaint);
app.post('/api/complaints', createComplaint);
app.get('/complaints', listComplaints);
app.get('/api/complaints', listComplaints);
app.get('/api/admin/complaints', listAdminComplaints);
app.patch('/api/admin/complaints/:id/status', updateComplaintStatus);
app.get('/api/options', (req, res) => res.json(datasetOptions));

io.on('connection', (socket) => {
  console.log('client connected', socket.id);
  socket.on('disconnect', () => console.log('client disconnected', socket.id));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
