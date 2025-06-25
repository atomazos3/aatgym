import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import Chart from 'chart.js/auto';
import dayjs from 'dayjs';

export default function BodyTracker() {
  const [weights, setWeights] = useState([]);
  const [weight, setWeight] = useState('');

  const addWeight = async (e) => {
    e.preventDefault();
    if (!weight) return;
    await addDoc(collection(db, 'bodyweights'), {
      weight: Number(weight),
      created: new Date().toISOString()
    });
    setWeight('');
  };

  const deleteWeight = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    await deleteDoc(doc(db, 'bodyweights', id));
  };

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'bodyweights'), orderBy('created', 'asc')), snapshot => {
      setWeights(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const canvas = document.getElementById('weightChart');
    if (!canvas || weights.length === 0) return;

    const labels = weights.map(w => dayjs(w.created).format('MMM D'));
    const data = weights.map(w => w.weight);

    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Body Weight (kg)',
          data,
          borderColor: '#facc15',
          backgroundColor: 'rgba(250, 204, 21, 0.2)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            ticks: { color: 'white' }
          },
          y: {
            ticks: { color: 'white' }
          }
        },
        plugins: {
          legend: {
            labels: {
              color: 'white'
            }
          }
        }
      }
    });

    return () => chart.destroy();
  }, [weights]);

  return (
    <div className="p-4 max-w-3xl mx-auto bg-black text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-yellow-400">📉 Body Tracker</h1>

      <form onSubmit={addWeight} className="flex gap-2 mb-6">
        <input
          type="number"
          placeholder="Your weight (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="p-2 rounded bg-gray-900 text-white"
        />
        <button type="submit" className="bg-blue-500 px-4 py-2 rounded text-white">Add</button>
      </form>

      <canvas id="weightChart" height="100" className="mb-6"></canvas>

      <ul className="space-y-2">
        {weights.map((w) => (
          <li key={w.id} className="bg-gray-800 p-3 rounded flex justify-between items-center">
            <div>
              <strong>{w.weight} kg</strong>
              <div className="text-sm text-gray-400">{new Date(w.created).toLocaleString()}</div>
            </div>
            <button onClick={() => deleteWeight(w.id)} className="text-red-400 underline">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}