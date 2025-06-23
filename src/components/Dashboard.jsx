import React from 'react';

export default function Dashboard() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">🏋️ AAT Gym Tracker</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-orange-100 dark:bg-orange-600 p-4 rounded shadow">
          <h2 className="font-semibold text-lg">Sleep</h2>
          <p className="text-xl">6.5 Hours</p>
        </div>
        <div className="bg-blue-100 dark:bg-blue-600 p-4 rounded shadow">
          <h2 className="font-semibold text-lg">Water</h2>
          <p className="text-xl">3 Liters</p>
        </div>
        <div className="bg-red-100 dark:bg-red-600 p-4 rounded shadow">
          <h2 className="font-semibold text-lg">Steps</h2>
          <p className="text-xl">7540</p>
        </div>
      </div>
    </div>
  );
}
