import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import OrderList from './pages/OrderList';
import OrderDetail from './pages/OrderDetail';
import AgentMonitor from './pages/AgentMonitor';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orders" element={<OrderList />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/monitor" element={<AgentMonitor />} />
      </Routes>
    </Layout>
  );
}