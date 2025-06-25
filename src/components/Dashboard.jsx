import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc
} from 'firebase/firestore';
import dayjs from 'dayjs';
import Chart from 'chart.js/auto';

export default function Dashboard() {
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState([]);
  const [weights, setWeights] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [sets, setSets] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyWeight, setBodyWeight] = useState('');
  const [range, setRange] = useState('weekly');
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, 'exercises'), snap => {
      const names = snap.docs.map(doc => doc.data().name);
      setExercises([...new Set(names)]);
    });

    const unsub2 = onSnapshot(query(collection(db, 'workouts'), orderBy('created', 'asc')), snap => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsub3 = onSnapshot(query(collection(db, 'bodyweight'), orderBy('created', 'asc')), snap => {
      setWeights(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsub1(); unsub2(); unsub3();
    };
  }, []);

  const handleAddOrUpdateLog = async (e) => {
    e.preventDefault();
    if (!selectedExercise || !sets || !weight) return;

    if (editing) {
      const ref = doc(db, 'workouts', editing.id);
      await updateDoc(ref, { name: selectedExercise, sets: Number(sets), weight: Number(weight), created: editing.created });
      setEditing(null);
    } else {
      await addDoc(collection(db, 'workouts'), {
        name: selectedExercise,
        sets: Number(sets),
        weight: Number(weight),
        created: new Date().toISOString()
      });
    }
    setSets('');
    setWeight('');
  };

  const handleEdit = (log) => {
    setEditing(log);
    setSelectedExercise(log.name);
    setSets(log.sets);
    setWeight(log.weight);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Delete this workout?")) {
      await deleteDoc(doc(db, 'workouts', id));
    }
  };

  const handleAddBodyWeight = async () => {
    if (!bodyWeight) return;
    await addDoc(collection(db, 'bodyweight'), {
      value: Number(bodyWeight),
      created: new Date().toISOString()
    });
    setBodyWeight('');
  };

  const handleDeleteWeight = async (id) => {
    if (window.confirm("Delete this entry?")) {
      await deleteDoc(doc(db, 'bodyweight', id));
    }
  };

  const getPR = (name) => {
    const records = logs.filter(log => log.name === name);
    return Math.max(...records.map(r => r.weight), 0);
  };

  useEffect(() => {
    const canvas = document.getElementById('exerciseChart');
    if (!canvas || !selectedExercise) return;

    const ctx = canvas.getContext('2d');
    const now = dayjs();
    const filtered = logs.filter(l => {
      const d = dayjs(l.created);
      if (l.name !== selectedExercise) return false;
      if (range === 'weekly') return d.isAfter(now.subtract(7, 'day'));
      if (range === 'monthly') return d.isAfter(now.subtract(1, 'month'));
      return true;
    });

    const chartData = {
      labels: filtered.map(l => dayjs(l.created).format('MMM D')),
      datasets: [{
        label: `${selectedExercise} (kg)`,
        data: filtered.map(l => l.weight),
        backgroundColor: '#facc15'
      }]
    };

    const chart = new Chart(ctx, {
      type: 'bar',
      data: chartData,
      options: {
        responsive: true,
        scales: {
          x: { ticks: { color: 'white' } },
          y: { ticks: { color: 'white' } }
        },
        plugins: {
          legend: {
            labels: { color: 'white' }
          }
        }
      }
    });

    return () => chart.destroy();
  }, [logs, selectedExercise, range]);

  return (
    <div>
      <h1 className="text-yellow-400 text-3xl font-bold mb-4">AAT Gym Tracker</h1>

      <form onSubmit={handleAddOrUpdateLog} className="flex flex-wrap gap-2 mb-4">
        <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} className="bg-gray-800 text-white p-2 rounded">
          <option value="">Select Exercise</option>
          {exercises.map((ex, idx) => <option key={idx} value={ex}>{ex}</option>)}
        </select>
        <input type="number" value={sets} onChange={e => setSets(e.target.value)} placeholder="Sets" className="bg-gray-800 text-white p-2 rounded" />
        <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="Weight (kg)" className="bg-gray-800 text-white p-2 rounded" />
        <button type="submit" className="bg-blue-500 px-4 py-2 rounded">{editing ? 'Update' : 'Add'}</button>
      </form>

      <div className="flex gap-2 mb-4">
        {['weekly', 'monthly', 'all'].map(r => (
          <button key={r} onClick={() => setRange(r)} className={\`px-4 py-2 rounded \${range === r ? 'bg-yellow-400 text-black' : 'bg-gray-700'}\`}>
            {r}
          </button>
        ))}
      </div>

      {selectedExercise && (
        <>
          <h2 className="text-lg mb-2">Chart: {selectedExercise} (PR: {getPR(selectedExercise)} kg)</h2>
          <canvas id="exerciseChart" height="100" className="mb-4"></canvas>
        </>
      )}

      <h2 className="text-xl mb-2">📉 Body Weight Tracker</h2>
      <div className="flex gap-2 mb-4">
        <input type="number" value={bodyWeight} onChange={e => setBodyWeight(e.target.value)} placeholder="Body weight (kg)" className="bg-gray-800 text-white p-2 rounded" />
        <button onClick={handleAddBodyWeight} className="bg-green-600 px-4 py-2 rounded">Add</button>
      </div>
      <ul className="mb-6">
        {weights.map(w => (
          <li key={w.id} className="flex justify-between bg-gray-800 p-2 rounded mb-1">
            <span>{w.value} kg - {new Date(w.created).toLocaleDateString()}</span>
            <button onClick={() => handleDeleteWeight(w.id)} className="text-red-400 underline">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}