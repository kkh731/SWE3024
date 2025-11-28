// src/App.tsx
import React, { useEffect, useState } from 'react';
import { Layout, Spin, Typography, Button } from 'antd';
import SchedulerPage from './pages/SchedulerPage';
import PersonaPage from './pages/PersonaPage';
import PersonaModal from './components/PersonaModal'; // Import PersonaModal
import { usePersonaStore } from './store/personaStore';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const { persona, isLoading, fetchPersona } = usePersonaStore();
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false); // State for modal visibility

  useEffect(() => {
    fetchPersona();
  }, [fetchPersona]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <Spin size="large" />
        </div>
      );
    }
    
    if (!persona) {
      return <PersonaPage />;
    }

    return <SchedulerPage />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <Title level={3} style={{ color: 'white', margin: 0 }}>AI Scheduler</Title>
        {persona && ( // Only show button if persona exists (after initial setup)
            <Button type="primary" onClick={() => setIsPersonaModalOpen(true)}>
                Manage Persona
            </Button>
        )}
      </Header>
      <Content style={{ padding: '24px 48px', background: '#f0f2f5' }}>
        {renderContent()}
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        AI Scheduler ©{new Date().getFullYear()} Created with Gemini
      </Footer>
      <PersonaModal 
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
      />
    </Layout>
  );
};

export default App;
