import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, remove, update } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { Clock, Plus, Trash2, Edit2 } from 'lucide-react';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAptgqDIUtwq1UVYeIGln1y5BfewzLA1Xw",
  authDomain: "kid-tracking-75156.firebaseapp.com",
  databaseURL: "https://kid-tracking-75156-default-rtdb.firebaseio.com",
  projectId: "kid-tracking-75156",
  storageBucket: "kid-tracking-75156.firebasestorage.app",
  messagingSenderId: "210212922724",
  appId: "1:210212922724:web:c7869ae39eee34b3f70671"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Activity types with colors
const ACTIVITY_TYPES = {
  eat: { label: '🍽️ Eat', color: 'bg-blue-100 text-blue-900' },
  sleep: { label: '😴 Sleep', color: 'bg-purple-100 text-purple-900' },
  diaper: { label: '🧷 Diaper Change', color: 'bg-yellow-100 text-yellow-900' }
};

function KidsLog() {
  const [roomCode, setRoomCode] = useState('');
  const [newRoomCode, setNewRoomCode] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [entries, setEntries] = useState([]);
  const [activityType, setActivityType] = useState('eat');
  const [childName, setChildName] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date().toISOString().slice(0, 16));
  const [editingId, setEditingId] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);

  // Sign in anonymously when room code is provided
  useEffect(() => {
    if (roomCode && !isAuthenticated) {
      signInAnonymously(auth)
        .then(() => {
          setIsAuthenticated(true);
          loadEntries();
        })
        .catch(error => console.error('Auth error:', error));
    }
  }, [roomCode]);

  // Load entries from Firebase
  const loadEntries = () => {
    if (!roomCode) return;

    const entriesRef = ref(database, `rooms/${roomCode}/entries`);
    onValue(entriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const entriesList = Object.entries(data).map(([id, entry]) => ({
          id,
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        // Sort by newest first
        entriesList.sort((a, b) => b.timestamp - a.timestamp);
        // Only keep last 10 days
        const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        setEntries(entriesList.filter(e => e.timestamp > tenDaysAgo));
      } else {
        setEntries([]);
      }
    });
  };

  // Add new entry
  const handleAddEntry = async () => {
    if (!childName.trim()) {
      alert('Please enter child name');
      return;
    }

    const entry = {
      childName,
      activityType,
      timestamp: new Date(selectedTime).toISOString(),
      notes,
      createdAt: new Date().toISOString()
    };

    try {
      const entriesRef = ref(database, `rooms/${roomCode}/entries`);
      await push(entriesRef, entry);

      // Reset form
      setChildName('');
      setActivityType('eat');
      setNotes('');
      setSelectedTime(new Date().toISOString().slice(0, 16));
    } catch (error) {
      console.error('Error adding entry:', error);
      alert('Error adding entry. Check your Firebase config.');
    }
  };

  // Delete entry
  const handleDeleteEntry = async (id) => {
    if (window.confirm('Delete this entry?')) {
      try {
        const entryRef = ref(database, `rooms/${roomCode}/entries/${id}`);
        await remove(entryRef);
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  // Edit entry
  const handleEditEntry = async (id) => {
    if (!editingEntry) return;

    try {
      const entryRef = ref(database, `rooms/${roomCode}/entries/${id}`);
      await update(entryRef, editingEntry);
      setEditingId(null);
      setEditingEntry(null);
    } catch (error) {
      console.error('Error updating entry:', error);
    }
  };

  // Room code entry screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Kids Activity Log</h1>
            <p className="text-gray-600">Track eating, sleeping, and diaper changes</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Family Room Code
              </label>
              <input
                type="text"
                value={newRoomCode}
                onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. FAMILY123"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setRoomCode(newRoomCode);
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                Create a code (like "FAMILY123") and share it with your family. Everyone uses the same code to access the log.
              </p>
            </div>

            <button
              onClick={() => setRoomCode(newRoomCode)}
              disabled={!newRoomCode.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300"
            >
              Enter Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main app
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Kids Activity Log</h1>
            <p className="text-sm text-gray-500">Room: {roomCode}</p>
          </div>
          <button
            onClick={() => {
              setIsAuthenticated(false);
              setRoomCode('');
              setEntries([]);
            }}
            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
          >
            Change Room
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 pb-20">
        {/* Add Entry Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Add Entry</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Child Name
                </label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="e.g. Emma"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Activity Type
                </label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(ACTIVITY_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time
              </label>
              <input
                type="datetime-local"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. had yogurt, seemed hungry"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleAddEntry}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Add Entry
            </button>
          </div>
        </div>

        {/* Entries List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Recent Entries (Last 10 Days)</h2>

          {entries.length === 0 ? (
            <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
              No entries yet. Add one to get started!
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className={`bg-white rounded-lg p-4 flex items-start justify-between ${
                  ACTIVITY_TYPES[entry.activityType].color
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{entry.childName}</span>
                    <span className="text-sm opacity-75">
                      {ACTIVITY_TYPES[entry.activityType].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm opacity-75 mb-1">
                    <Clock size={14} />
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  {entry.notes && (
                    <p className="text-sm opacity-85">{entry.notes}</p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {
                      if (editingId === entry.id) {
                        handleEditEntry(entry.id);
                      } else {
                        setEditingId(entry.id);
                        setEditingEntry({ ...entry });
                      }
                    }}
                    className="p-2 hover:bg-black hover:bg-opacity-10 rounded"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-2 hover:bg-black hover:bg-opacity-10 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export de