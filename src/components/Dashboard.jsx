import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import Chart from 'chart.js/auto';

export default function Dashboard() {
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState([]);
  const [newExercise, setNewExercise] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [sets, setSets] = useState('');
  const [weight, setWeight] = useState('');

  const handleAddExercise = async (e) => {
    e.preventDefault();
    if (newExercise.trim()) {
      await addDoc(collection(db, 'exercises'), { name: newExercise.trim() });
      setNewExercise('');
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!selectedExercise || !sets || !weight) return;
    await addDoc(collection(db, 'workouts'), {
      name: selectedExercise,
      sets: Number(sets),
      weight: Number(weight),
      created: new Date().toISOString()
    });
    setSets('');
    setWeight('');
  };

  useEffect(() => {
    const q1 = query(collection(db, 'exercises'));
    const unsub1 = onSnapshot(q1, snapshot => {
      setExercises(snapshot.docs.map(doc => doc.data().name));
    });

    const q2 = query(collection(db, 'workouts'), orderBy('created', 'desc'));
    const unsub2 = onSnapshot(q2, snapshot => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  useEffect(() => {
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;

    const grouped = logs.reduce((acc, log) => {
      if (!acc[log.name]) acc[log.name] = {};
      const date = log.created?.slice(0, 10);
      acc[log.name][date] = (acc[log.name][date] || 0) + (log.sets * log.weight);
      return acc;
    }, {});

    if (!selectedExercise || !grouped[selectedExercise]) return;

    const data = grouped[selectedExercise];

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(data),
        datasets: [{
          label: `Total for ${selectedExercise}`,
          data: Object.values(data),
          backgroundColor: 'rgba(59, 130, 246, 0.6)'
        }]
      }
    });

    return () => chart.destroy();
  }, [logs, selectedExercise]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🏋️ AAT Gym Tracker</h1>

      <form onSubmit={handleAddExercise} className="flex gap-2 mb-6">
        <input type="text" placeholder="New Exercise" value={newExercise} onChange={e => setNewExercise(e.target.value)} className="p-2 border rounded text-black" />
        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">Add Exercise</button>
      </form>

      <form onSubmit={handleAddLog} className="grid md:grid-cols-4 gap-2 mb-6">
        <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} className="p-2 border rounded text-black">
          <option value="">Select Exercise</option>
          {exercises.map((ex, i) => (
            <option key={i} value={ex}>{ex}</option>
          ))}
        </select>
        <input type="number" placeholder="Sets" value={sets} onChange={e => setSets(e.target.value)} className="p-2 border rounded text-black" />
        <input type="number" placeholder="Weight (kg)" value={weight} onChange={e => setWeight(e.target.value)} className="p-2 border rounded text-black" />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Add</button>
      </form>

      <canvas id="progressChart" height="150" className="mb-6"></canvas>

      <ul className="space-y-2">
        {logs.filter(log => log.name === selectedExercise).map((log, i) => (
          <li key={i} className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
            <strong>{log.name}</strong> – {log.sets} sets × {log.weight} kg
            <div className="text-sm text-gray-500">{new Date(log.created).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
