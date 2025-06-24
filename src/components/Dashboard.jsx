import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Chart from 'chart.js/auto';

export default function Dashboard() {
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState([]);
  const [newExercise, setNewExercise] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [sets, setSets] = useState('');
  const [weight, setWeight] = useState('');
  const [editing, setEditing] = useState(null);

  const handleAddExercise = async (e) => {
    e.preventDefault();
    const name = newExercise.trim();
    if (!name || exercises.includes(name)) return;
    await addDoc(collection(db, 'exercises'), { name });
    setNewExercise('');
    setSelectedExercise(name);
  };

  const handleAddOrUpdateLog = async (e) => {
    e.preventDefault();
    if (!selectedExercise || !sets || !weight) return;
    if (editing) {
      const ref = doc(db, 'workouts', editing.id);
      await updateDoc(ref, {
        sets: Number(sets),
        weight: Number(weight),
        name: selectedExercise,
        created: editing.created,
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
    const confirm = window.confirm("Are you sure you want to delete this workout?");
    if (!confirm) return;
    await deleteDoc(doc(db, 'workouts', id));
  };

  useEffect(() => {
    const unsub1 = onSnapshot(query(collection(db, 'exercises')), snapshot => {
      const names = snapshot.docs.map(doc => doc.data().name).filter(Boolean);
      setExercises(Array.from(new Set(names)).sort());
    });

    const unsub2 = onSnapshot(query(collection(db, 'workouts'), orderBy('created', 'desc')), snapshot => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  useEffect(() => {
    const charts = {};
    const grouped = logs.reduce((acc, log) => {
      if (!acc[log.name]) acc[log.name] = {};
      const date = log.created?.slice(0, 10);
      acc[log.name][date] = (acc[log.name][date] || 0) + (log.sets * log.weight);
      return acc;
    }, {});

    Object.keys(grouped).forEach(name => {
      const ctx = document.getElementById(`chart-${name}`);
      if (ctx) {
        charts[name] = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: Object.keys(grouped[name]),
            datasets: [{
              label: `Total for ${name}`,
              data: Object.values(grouped[name]),
              backgroundColor: 'rgba(59, 130, 246, 0.6)'
            }]
          }
        });
      }
    });

    return () => {
      Object.values(charts).forEach(chart => chart.destroy());
    };
  }, [logs]);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🏋️ AAT Gym Tracker</h1>

      <form onSubmit={handleAddExercise} className="flex gap-2 mb-6">
        <input type="text" placeholder="New Exercise" value={newExercise} onChange={e => setNewExercise(e.target.value)} className="p-2 border rounded text-black" />
        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded">Add Exercise</button>
      </form>

      <form onSubmit={handleAddOrUpdateLog} className="grid md:grid-cols-4 gap-2 mb-6">
        <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} className="p-2 border rounded text-black">
          <option value="">Select Exercise</option>
          {exercises.map((ex, i) => (
            <option key={i} value={ex}>{ex}</option>
          ))}
        </select>
        <input type="number" placeholder="Sets" value={sets} onChange={e => setSets(e.target.value)} className="p-2 border rounded text-black" />
        <input type="number" placeholder="Weight (kg)" value={weight} onChange={e => setWeight(e.target.value)} className="p-2 border rounded text-black" />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">{editing ? "Update" : "Add"}</button>
      </form>

      {exercises.map((name, index) => (
        <div key={index} className="mb-10">
          <h2 className="text-xl font-semibold mb-2">{name}</h2>
          <canvas id={`chart-${name}`} height="100" className="mb-4"></canvas>
          <ul className="space-y-2">
            {logs.filter(log => log.name === name).map((log, i) => (
              <li key={log.id} className="bg-gray-100 dark:bg-gray-800 p-3 rounded flex justify-between items-center">
                <div>
                  <strong>{log.sets} sets × {log.weight} kg</strong>
                  <div className="text-sm text-gray-500">{new Date(log.created).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(log)} className="text-blue-600 underline">Edit</button>
                  <button onClick={() => handleDelete(log.id)} className="text-red-600 underline">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
