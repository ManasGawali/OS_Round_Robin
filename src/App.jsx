import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2 } from 'lucide-react';

const RoundRobinScheduler = () => {
  const [processes, setProcesses] = useState([
    { id: 1, name: 'P1', burstTime: 8, remainingTime: 8, arrivalTime: 0, color: '#FF6B6B' },
    { id: 2, name: 'P2', burstTime: 4, remainingTime: 4, arrivalTime: 1, color: '#4ECDC4' },
    { id: 3, name: 'P3', burstTime: 9, remainingTime: 9, arrivalTime: 2, color: '#96CEB4' },
    { id: 4, name: 'P4', burstTime: 5, remainingTime: 5, arrivalTime: 3, color: '#45B7D1' }
  ]);
  
  const [timeQuantum, setTimeQuantum] = useState(3);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentProcessId, setCurrentProcessId] = useState(null);
  const [quantumUsed, setQuantumUsed] = useState(0);
  const [completedProcesses, setCompletedProcesses] = useState([]);
  const [ganttChart, setGanttChart] = useState([]);
  const [readyQueue, setReadyQueue] = useState([]);
  const [newProcess, setNewProcess] = useState({ name: '', burstTime: '', arrivalTime: '' });
  const [lastProcessOrder, setLastProcessOrder] = useState([]);
  
  const intervalRef = useRef(null);

  // Initialize ready queue when component mounts or processes change
  useEffect(() => {
    updateReadyQueue();
  }, [processes, currentTime, completedProcesses]);

  const updateReadyQueue = () => {
    const arrivedProcesses = processes.filter(p => 
      p.arrivalTime <= currentTime && 
      p.remainingTime > 0 && 
      !completedProcesses.find(cp => cp.id === p.id)
    );
    setReadyQueue(arrivedProcesses);
    
    // If no current process is set and we have processes in queue, set the first one
    if (!currentProcessId && arrivedProcesses.length > 0) {
      setCurrentProcessId(arrivedProcesses[0].id);
    }
    
    // If current process is no longer available, move to next
    if (currentProcessId && !arrivedProcesses.find(p => p.id === currentProcessId)) {
      const currentIndex = lastProcessOrder.indexOf(currentProcessId);
      const nextProcesses = arrivedProcesses.filter(p => !lastProcessOrder.slice(0, currentIndex + 1).includes(p.id));
      
      if (nextProcesses.length > 0) {
        setCurrentProcessId(nextProcesses[0].id);
      } else if (arrivedProcesses.length > 0) {
        setCurrentProcessId(arrivedProcesses[0].id);
        setLastProcessOrder(arrivedProcesses.map(p => p.id));
      }
    }
  };

  const getCurrentProcess = () => {
    return processes.find(p => p.id === currentProcessId && p.remainingTime > 0) || null;
  };

  const getNextProcessId = () => {
    const availableProcesses = processes.filter(p => 
      p.arrivalTime <= currentTime && 
      p.remainingTime > 0 &&
      !completedProcesses.find(cp => cp.id === p.id)
    );
    
    if (availableProcesses.length === 0) return null;
    
    const currentIndex = availableProcesses.findIndex(p => p.id === currentProcessId);
    const nextIndex = (currentIndex + 1) % availableProcesses.length;
    return availableProcesses[nextIndex].id;
  };

  const step = () => {
    const currentProcess = getCurrentProcess();
    
    if (!currentProcess) {
      setCurrentTime(prev => prev + 1);
      return;
    }

    // Execute current process for 1 time unit
    setProcesses(prev => prev.map(p => 
      p.id === currentProcess.id 
        ? { ...p, remainingTime: p.remainingTime - 1 }
        : p
    ));

    // Update Gantt chart
    setGanttChart(prev => [
      ...prev,
      { processName: currentProcess.name, time: currentTime, color: currentProcess.color }
    ]);

    setQuantumUsed(prev => prev + 1);
    setCurrentTime(prev => prev + 1);

    // Check if process is completed
    if (currentProcess.remainingTime === 1) {
      setCompletedProcesses(prev => [...prev, {
        ...currentProcess,
        completionTime: currentTime + 1,
        turnaroundTime: currentTime + 1 - currentProcess.arrivalTime,
        waitingTime: currentTime + 1 - currentProcess.arrivalTime - currentProcess.burstTime
      }]);
      setQuantumUsed(0);
      
      // Move to next process
      const nextId = getNextProcessId();
      setCurrentProcessId(nextId);
    }
    // Check if quantum is exhausted
    else if (quantumUsed + 1 >= timeQuantum) {
      setQuantumUsed(0);
      
      // Move to next process in round robin fashion
      const nextId = getNextProcessId();
      setCurrentProcessId(nextId);
    }

    // Check if all processes are completed
    const allCompleted = processes.every(p => p.remainingTime <= 1 || completedProcesses.find(cp => cp.id === p.id));
    if (allCompleted && currentProcess.remainingTime === 1) {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(step, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isRunning, currentTime, quantumUsed, currentProcessId, processes, completedProcesses]);

  const toggleSimulation = () => {
    setIsRunning(!isRunning);
  };

  const reset = () => {
    setIsRunning(false);
    setCurrentTime(0);
    setCurrentProcessId(null);
    setQuantumUsed(0);
    setCompletedProcesses([]);
    setGanttChart([]);
    setLastProcessOrder([]);
    setProcesses(prev => prev.map(p => ({ ...p, remainingTime: p.burstTime })));
  };

  const addProcess = () => {
    if (newProcess.name && newProcess.burstTime && newProcess.arrivalTime !== '') {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF'];
      const newId = Math.max(...processes.map(p => p.id)) + 1;
      const color = colors[newId % colors.length];
      
      setProcesses(prev => [...prev, {
        id: newId,
        name: newProcess.name,
        burstTime: parseInt(newProcess.burstTime),
        remainingTime: parseInt(newProcess.burstTime),
        arrivalTime: parseInt(newProcess.arrivalTime),
        color
      }]);
      
      setNewProcess({ name: '', burstTime: '', arrivalTime: '' });
    }
  };

  const removeProcess = (id) => {
    setProcesses(prev => prev.filter(p => p.id !== id));
  };

  const currentProcess = getCurrentProcess();
  const avgTurnaroundTime = completedProcesses.length > 0 
    ? (completedProcesses.reduce((sum, p) => sum + p.turnaroundTime, 0) / completedProcesses.length).toFixed(2)
    : 0;
  const avgWaitingTime = completedProcesses.length > 0
    ? (completedProcesses.reduce((sum, p) => sum + p.waitingTime, 0) / completedProcesses.length).toFixed(2)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Round Robin CPU Scheduler</h1>
          <p className="text-slate-300">Interactive simulation of Round Robin scheduling algorithm</p>
        </div>

        {/* Controls */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-6 border border-white/20">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <button
              onClick={toggleSimulation}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {isRunning ? <Pause size={20} /> : <Play size={20} />}
              {isRunning ? 'Pause' : 'Start'}
            </button>
            
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              <RotateCcw size={20} />
              Reset
            </button>

            <div className="flex items-center gap-2">
              <label className="text-white font-medium">Time Quantum:</label>
              <input
                type="number"
                value={timeQuantum}
                onChange={(e) => setTimeQuantum(parseInt(e.target.value) || 1)}
                min="1"
                max="10"
                className="w-16 px-2 py-1 rounded bg-white/20 text-white border border-white/30"
                disabled={isRunning}
              />
            </div>

            <div className="text-white font-medium">
              Current Time: <span className="text-blue-300">{currentTime}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Process Management */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Process Management</h2>
            
            {/* Add Process */}
            <div className="mb-4 p-4 bg-white/5 rounded-lg">
              <h3 className="text-white font-medium mb-2">Add New Process</h3>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={newProcess.name}
                  onChange={(e) => setNewProcess(prev => ({ ...prev, name: e.target.value }))}
                  className="px-2 py-1 rounded bg-white/20 text-white placeholder-white/60 border border-white/30"
                />
                <input
                  type="number"
                  placeholder="Burst"
                  value={newProcess.burstTime}
                  onChange={(e) => setNewProcess(prev => ({ ...prev, burstTime: e.target.value }))}
                  className="px-2 py-1 rounded bg-white/20 text-white placeholder-white/60 border border-white/30"
                />
                <input
                  type="number"
                  placeholder="Arrival"
                  value={newProcess.arrivalTime}
                  onChange={(e) => setNewProcess(prev => ({ ...prev, arrivalTime: e.target.value }))}
                  className="px-2 py-1 rounded bg-white/20 text-white placeholder-white/60 border border-white/30"
                />
                <button
                  onClick={addProcess}
                  className="flex items-center justify-center px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Process List */}
            <div className="space-y-2">
              {processes.map((process) => (
                <div
                  key={process.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                    currentProcess?.id === process.id 
                      ? 'bg-yellow-500/30 border-2 border-yellow-400 transform scale-105' 
                      : 'bg-white/5 border border-white/20'
                  }`}
                  style={{ borderLeft: `4px solid ${process.color}` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-white font-semibold">{process.name}</div>
                    <div className="text-slate-300 text-sm">
                      Burst: {process.burstTime} | Remaining: {process.remainingTime} | Arrival: {process.arrivalTime}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentProcess?.id === process.id && (
                      <div className="text-yellow-400 text-sm font-medium">
                        Running ({quantumUsed}/{timeQuantum})
                      </div>
                    )}
                    <button
                      onClick={() => removeProcess(process.id)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                      disabled={isRunning}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ready Queue Visualization */}
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Ready Queue (Circular)</h2>
            <div className="relative h-64 flex items-center justify-center">
              {readyQueue.length > 0 ? (
                <div className="relative">
                  {readyQueue.map((process, index) => {
                    const angle = (index * 360) / readyQueue.length;
                    const radius = 80;
                    const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
                    const y = Math.sin((angle - 90) * Math.PI / 180) * radius;
                    const isActive = currentProcess?.id === process.id;
                    
                    return (
                      <div
                        key={process.id}
                        className={`absolute w-16 h-16 rounded-full border-2 flex items-center justify-center text-white font-semibold transition-all duration-500 ${
                          isActive ? 'transform scale-125 ring-4 ring-yellow-400' : ''
                        }`}
                        style={{
                          left: `calc(50% + ${x}px - 32px)`,
                          top: `calc(50% + ${y}px - 32px)`,
                          backgroundColor: process.color,
                          borderColor: isActive ? '#FFF' : process.color
                        }}
                      >
                        {process.name}
                      </div>
                    );
                  })}
                  
                  {/* Center indicator */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-white/20 rounded-full border-2 border-white/40 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 text-center">
                  <div className="text-4xl mb-2">⏸️</div>
                  <div>No processes in ready queue</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mt-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Gantt Chart</h2>
          <div className="overflow-x-auto">
            <div className="flex min-w-max">
              {ganttChart.map((entry, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center min-w-[60px] border-r border-white/20"
                >
                  <div
                    className="w-full h-12 flex items-center justify-center text-white font-semibold border border-white/30"
                    style={{ backgroundColor: entry.color }}
                  >
                    {entry.processName}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">{entry.time}</div>
                </div>
              ))}
              {ganttChart.length > 0 && (
                <div className="flex flex-col items-center">
                  <div className="w-1 h-12"></div>
                  <div className="text-xs text-slate-300 mt-1">{currentTime}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statistics */}
        {completedProcesses.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mt-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Completed Processes & Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="text-left py-2">Process</th>
                      <th className="text-left py-2">Completion</th>
                      <th className="text-left py-2">Turnaround</th>
                      <th className="text-left py-2">Waiting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedProcesses.map((process) => (
                      <tr key={process.id} className="border-b border-white/10">
                        <td className="py-2" style={{ color: process.color }}>{process.name}</td>
                        <td className="py-2">{process.completionTime}</td>
                        <td className="py-2">{process.turnaroundTime}</td>
                        <td className="py-2">{process.waitingTime}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-col justify-center space-y-4">
                <div className="bg-blue-600/20 p-4 rounded-lg border border-blue-500/30">
                  <div className="text-blue-300 text-sm">Average Turnaround Time</div>
                  <div className="text-white text-2xl font-bold">{avgTurnaroundTime}</div>
                </div>
                <div className="bg-green-600/20 p-4 rounded-lg border border-green-500/30">
                  <div className="text-green-300 text-sm">Average Waiting Time</div>
                  <div className="text-white text-2xl font-bold">{avgWaitingTime}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoundRobinScheduler;