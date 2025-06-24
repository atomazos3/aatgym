import React, { useEffect, useState } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Chart from 'chart.js/auto';

export default function Dashboard() {
  const [exercises, setExercises] = useState([]);
  const [logs, setLogs] = useState([]);
  const [weights, setWeights] = useState([]);
  const [newExercise, setNewExercise] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [sets, setSets] = useState('');
  const [weight, setWeight] = useState('');
  const [bodyWeight, setBodyWeight] = useState('');
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

  const handleAddBodyWeight = async (e) => {
    e.preventDefault();
    if (!bodyWeight) return;
    await addDoc(collection(db, 'bodyWeight'), {
      kg: Number(bodyWeight),
      created: new Date().toISOString()
    });
    setBodyWeight('');
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

    const unsub3 = onSnapshot(query(collection(db, 'bodyWeight'), orderBy('created')), snapshot => {
      setWeights(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  useEffect(() => {
    const chartCanvas = document.getElementById('exerciseChart');
    if (!chartCanvas || !selectedExercise) return;

    const grouped = logs
      .filter(log => log.name === selectedExercise)
      .reduce((acc, log) => {
        const date = log.created?.slice(0, 10);
        acc[date] = (acc[date] || 0) + (log.sets * log.weight);
        return acc;
      }, {});

    const chart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels: Object.keys(grouped),
        datasets: [{
          label: `Total for ${selectedExercise}`,
          data: Object.values(grouped),
          backgroundColor: 'rgba(59, 130, 246, 0.6)'
        }]
      }
    });

    return () => chart.destroy();
  }, [logs, selectedExercise]);

  useEffect(() => {
    const weightCanvas = document.getElementById('bodyWeightChart');
    if (!weightCanvas || weights.length === 0) return;

    const grouped = weights.reduce((acc, entry) => {
      const date = entry.created?.slice(0, 10);
      acc[date] = entry.kg;
      return acc;
    }, {});

    const chart = new Chart(weightCanvas, {
      type: 'line',
      data: {
        labels: Object.keys(grouped),
        datasets: [{
          label: 'Body Weight (kg)',
          data: Object.values(grouped),
          borderColor: 'orange',
          fill: false
        }]
      }
    });

    return () => chart.destroy();
  }, [weights]);

  const currentWeek = new Date().toISOString().slice(0, 10).slice(0, 8);
  const weeklyLogs = logs.filter(log => log.created?.startsWith(currentWeek));

  const weeklyVolume = weeklyLogs.reduce((sum, log) => sum + log.sets * log.weight, 0);
  const workoutCount = new Set(weeklyLogs.map(log => log.created.slice(0, 10))).size;
  const topExercise = logs.reduce((acc, log) => {
    acc[log.name] = (acc[log.name] || 0) + 1;
    return acc;
  }, {});
  const mostFrequent = Object.entries(topExercise).sort((a, b) => b[1] - a[1])[0]?.[0];

  const getPR = (name) => {
    const records = logs.filter(l => l.name === name);
    return Math.max(...records.map(r => r.sets * r.weight), 0);
  };

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🏋️ AAT Gym Tracker</h1>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-100 rounded">💪 Volume this week: <strong>{weeklyVolume} kg</strong></div>
        <div className="p-4 bg-green-100 rounded">📆 Workouts this week: <strong>{workoutCount}</strong></div>
        <div className="p-4 bg-yellow-100 rounded">🔥 Most frequent: <strong>{mostFrequent || 'N/A'}</strong></div>
      </div>

      <form onSubmit={handleAddExercise} className="flex gap-2 mb-4">
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

      <form onSubmit={handleAddBodyWeight} className="flex gap-2 mb-6">
        <input type="number" placeholder="Body Weight (kg)" value={bodyWeight} onChange={e => setBodyWeight(e.target.value)} className="p-2 border rounded text-black" />
        <button type="submit" className="bg-orange-500 text-white px-4 py-2 rounded">Log Weight</button>
      </form>

      {selectedExercise && (
        <>
          <h2 className="text-xl font-semibold mb-2">📈 {selectedExercise} Progress (PR: {getPR(selectedExercise)} kg)</h2>
          <canvas id="exerciseChart" height="100" className="mb-4"></canvas>
          <ul className="space-y-2 mb-6">
            {logs.filter(log => log.name === selectedExercise).map((log) => (
              <li key={log.id} className="bg-gray-100 dark:bg-gray-800 p-3 rounded flex justify-between items-center">
                <div>
                  <strong>{log.sets} × {log.weight} kg</strong> {log.sets * log.weight === getPR(log.name) && <span className="text-red-600 ml-2">🏅 PR</span>}
                  <div className="text-sm text-gray-500">{new Date(log.created).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(log)} className="text-blue-600 underline">Edit</button>
                  <button onClick={() => handleDelete(log.id)} className="text-red-600 underline">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {weights.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-2">📉 Body Weight Over Time</h2>
          <canvas id="bodyWeightChart" height="100" className="mb-4"></canvas>
        </>
      )}
    </div>
  );
}
