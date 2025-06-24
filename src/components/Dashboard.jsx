
import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Chart from 'chart.js/auto';
import dayjs from 'dayjs';

export default function Dashboard() {
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [sets, setSets] = useState('');
  const [weight, setWeight] = useState('');
  const [range, setRange] = useState('weekly'); // weekly | monthly | all

  const [editing, setEditing] = useState(null);

  const handleAddOrUpdateLog = async (e) => {
    e.preventDefault();
    if (!selectedExercise || !sets || !weight) return;
    if (editing) {
      const ref = doc(db, 'workouts', editing.id);
      await updateDoc(ref, {
        sets: Number(sets),
        weight: Number(weight),
        name: selectedExercise,
        created: editing.created
      });
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
    setSets(log.sets);
    setWeight(log.weight);
    setSelectedExercise(log.name);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this workout?')) return;
    await deleteDoc(doc(db, 'workouts', id));
  };

  useEffect(() => {
    const unsub1 = onSnapshot(query(collection(db, 'exercises')), snapshot => {
      const names = snapshot.docs.map(doc => doc.data().name).filter(Boolean);
      setExercises(Array.from(new Set(names)).sort());
    });

    const unsub2 = onSnapshot(query(collection(db, 'workouts'), orderBy('created', 'asc')), snapshot => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  useEffect(() => {
    const chartCanvas = document.getElementById('exerciseChart');
    if (!chartCanvas || !selectedExercise) return;

    const now = dayjs();
    const filteredLogs = logs.filter(log => {
      const date = dayjs(log.created);
      if (log.name !== selectedExercise) return false;
      if (range === 'weekly') return date.isAfter(now.subtract(7, 'day'));
      if (range === 'monthly') return date.isAfter(now.subtract(1, 'month'));
      return true;
    });

    const labels = filteredLogs.map(log => dayjs(log.created).format('MMM D - HH:mm'));
    const data = filteredLogs.map(log => log.sets * log.weight);

    const chart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: `${selectedExercise} Volume`,
          data,
          backgroundColor: '#4b5563'
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            ticks: {
              color: 'white'
            }
          },
          y: {
            ticks: {
              color: 'white'
            }
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
  }, [logs, selectedExercise, range]);

  const getPR = (name) => {
    const records = logs.filter(l => l.name === name);
    return Math.max(...records.map(r => r.weight), 0);
  };

  return (
    <div className="p-4 max-w-5xl mx-auto bg-black text-white min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-yellow-400">🏋️ AAT Gym Tracker</h1>

      <form onSubmit={handleAddOrUpdateLog} className="grid md:grid-cols-4 gap-2 mb-6">
        <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} className="p-2 border rounded bg-gray-900 text-white">
          <option value="">Select Exercise</option>
          {exercises.map((ex, i) => (
            <option key={i} value={ex}>{ex}</option>
          ))}
        </select>
        <input type="number" placeholder="Sets" value={sets} onChange={e => setSets(e.target.value)} className="p-2 border rounded bg-gray-900 text-white" />
        <input type="number" placeholder="Weight (kg)" value={weight} onChange={e => setWeight(e.target.value)} className="p-2 border rounded bg-gray-900 text-white" />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">{editing ? "Update" : "Add"}</button>
      </form>

      <div className="flex gap-2 mb-4">
        {['weekly', 'monthly', 'all'].map(r => (
          <button key={r} onClick={() => setRange(r)}
            className={`px-4 py-2 rounded ${range === r ? 'bg-yellow-400 text-black' : 'bg-gray-700 text-white'}`}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>

      {selectedExercise && (
        <>
          <h2 className="text-xl font-semibold mb-2 text-yellow-300">
            📈 {selectedExercise} Progress (PR: {getPR(selectedExercise)} kg)
          </h2>
          <canvas id="exerciseChart" height="100" className="mb-6"></canvas>
          <ul className="space-y-2 mb-6">
            {logs.filter(log => log.name === selectedExercise).map((log) => (
              <li key={log.id} className="bg-gray-800 p-3 rounded flex justify-between items-center">
                <div>
                  <strong>{log.sets} × {log.weight} kg</strong>
                  <div className="text-sm text-gray-400">{new Date(log.created).toLocaleString()}</div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleEdit(log)} className="text-blue-400 underline">Edit</button>
                  <button onClick={() => handleDelete(log.id)} className="text-red-400 underline">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
