import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import Chart from 'chart.js/auto';

export default function Dashboard() {
  const [exercises, setExercises] = useState([]);
  const [name, setName] = useState('');
  const [sets, setSets] = useState('');
  const [weight, setWeight] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !sets || !weight) return;
    await addDoc(collection(db, 'workouts'), {
      name,
      sets: Number(sets),
      weight: Number(weight),
      created: new Date().toISOString()
    });
    setName('');
    setSets('');
    setWeight('');
  };

  useEffect(() => {
    const q = query(collection(db, 'workouts'), orderBy('created', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExercises(items);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const ctx = document.getElementById('progressChart');
    if (!ctx) return;

    const data = exercises.reduce((acc, curr) => {
      const date = curr.created?.slice(0, 10);
      acc[date] = (acc[date] || 0) + (curr.sets * curr.weight);
      return acc;
    }, {});

    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(data),
        datasets: [{
          label: 'Total Weight Lifted',
          data: Object.values(data),
          backgroundColor: 'rgba(59, 130, 246, 0.6)'
        }]
      }
    });

    return () => chart.destroy();
  }, [exercises]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🏋️ AAT Gym Tracker</h1>

      <form onSubmit={handleSubmit} className="grid md:grid-cols-4 gap-2 mb-6">
        <input type="text" placeholder="Exercise" value={name} onChange={e => setName(e.target.value)} className="p-2 border rounded" />
        <input type="number" placeholder="Sets" value={sets} onChange={e => setSets(e.target.value)} className="p-2 border rounded" />
        <input type="number" placeholder="Weight (kg)" value={weight} onChange={e => setWeight(e.target.value)} className="p-2 border rounded" />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Add</button>
      </form>

      <canvas id="progressChart" height="150" className="mb-6"></canvas>

      <ul className="space-y-2">
        {exercises.map((ex, i) => (
          <li key={i} className="bg-gray-100 dark:bg-gray-800 p-3 rounded">
            <strong>{ex.name}</strong> – {ex.sets} sets × {ex.weight} kg
            <div className="text-sm text-gray-500">{new Date(ex.created).toLocaleString()}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
