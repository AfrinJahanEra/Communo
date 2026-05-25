import { useState } from "react";

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-10 rounded-xl shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-6">
          Counter App
        </h1>

        <p className="text-5xl font-semibold mb-6">
          {count}
        </p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => setCount(count - 1)}
            className="px-5 py-2 bg-red-500 text-white rounded-lg"
          >
            Decrease
          </button>

          <button
            onClick={() => setCount(0)}
            className="px-5 py-2 bg-gray-500 text-white rounded-lg"
          >
            Reset
          </button>

          <button
            onClick={() => setCount(count + 1)}
            className="px-5 py-2 bg-green-500 text-white rounded-lg"
          >
            Increase
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;