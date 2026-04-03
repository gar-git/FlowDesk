import { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const API = '/api';

const defaultUser = { id: null, name: '', role: 'developer', token: '' };

function App() {
  const [user, setUser] = useState(defaultUser);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [taskList, setTaskList] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  const attachSocket = (uid) => {
    const s = io('http://localhost:4000');
    s.on('connect', () => { s.emit('register', uid); });
    s.on('notification', (n) => setNotifications((prev) => [...prev, n]));
    setSocket(s);
  };

  useEffect(() => { if (user.id) attachSocket(user.id); }, [user.id]);

  const login = async () => {
    const res = await axios.post(`${API}/users/login`, { email: authEmail, password: authPassword });
    setUser({ ...res.data.user, token: res.data.token });
  };

  const loadTasks = async () => {
    if (!user.token) return;
    const res = await axios.get(`${API}/tasks/mine`, { headers: { Authorization: `Bearer ${user.token}` }});
    setTaskList(res.data);
  };

  useEffect(() => { if (user.token) loadTasks(); }, [user.token]);

  const createTask = async () => {
    const title = prompt('Task title');
    const description = prompt('Task description');
    const assignee = parseInt(prompt('Assignee ID (number)'));
    if (!title || !assignee) return;
    await axios.post(`${API}/tasks`, { title, description, assignee_id: assignee }, { headers: { Authorization: `Bearer ${user.token}` }});
    await loadTasks();
  };

  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      {!user.token && (
        <div>
          <h2>Login</h2>
          <input value={authEmail} onChange={(e)=>setAuthEmail(e.target.value)} placeholder="Email" />
          <input type="password" value={authPassword} onChange={(e)=>setAuthPassword(e.target.value)} placeholder="Password" />
          <button onClick={login}>Login</button>
        </div>
      )}
      {user.token && (
        <div>
          <h2>Welcome, {user.name} ({user.role})</h2>
          <button onClick={() => setUser(defaultUser)}>Logout</button>
          <button onClick={loadTasks}>Refresh tasks</button>
          <button onClick={createTask}>Create Task</button>
          <h3>Notifications ({notifications.length})</h3>
          <ul>
            {notifications.map((x,i)=><li key={i}>{x.type}: {JSON.stringify(x.payload)}</li>)}
          </ul>
          <h3>My tasks</h3>
          <div style={{ display:'grid', gap:8 }}>
            {['todo','ongoing','completed'].map(status=> (
              <div key={status} style={{ border:'1px solid #ccc', padding:10 }}>
                <h4>{status.toUpperCase()}</h4>
                {taskList.filter(t=>t.status===status).map(t=> (
                  <button key={t.id} style={{display:'block',textAlign:'left',width:'100%'}} onClick={()=>setSelectedTask(t)}>
                    {t.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
          {selectedTask && (
            <div style={{ position:'fixed', top:30, right:30, border:'1px solid #333', padding:16, background:'white', zIndex:100 }}>
              <h4>{selectedTask.title}</h4>
              <p>{selectedTask.description}</p>
              <p>Status: {selectedTask.status}</p>
              <button onClick={()=>setSelectedTask(null)}>Close</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
