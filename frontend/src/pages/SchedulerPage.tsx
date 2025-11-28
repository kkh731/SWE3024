// src/pages/SchedulerPage.tsx
import React, { useEffect, useState } from 'react';
import { Badge, Calendar, Card, Col, Row, List, Typography, Tag, Button, Popconfirm, Space, Tooltip } from 'antd';
import { useScheduleStore } from '../store/scheduleStore';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { DeleteOutlined, EditOutlined, PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
import ScheduleModal from '../components/ScheduleModal';
import AIRecommenderModal from '../components/AIRecommenderModal';

// --- Start of Local Type Definitions ---
// Types are defined locally to bypass a persistent module resolution/caching issue.
export interface Schedule {
  id: number;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  is_completed: boolean;
  is_ai_generated: boolean;
  ai_reason?: string;
  created_at: string;
}

export interface ScheduleCreate {
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  is_completed?: boolean;
}

export interface ScheduleBulkCreateItemInput {
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    reason?: string;
}
// --- End of Local Type Definitions ---


const { Text, Title } = Typography;

const SchedulerPage: React.FC = () => {
  const { schedules, selectedDate, fetchSchedules, setSelectedDate, removeSchedule, toggleScheduleStatus, addSchedule, editSchedule, bulkAddSchedules } = useScheduleStore();
  
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const onPanelChange = (value: Dayjs) => {
    const startOfMonth = value.startOf('month').format('YYYY-MM-DDTHH:mm:ss');
    const endOfMonth = value.endOf('month').format('YYYY-MM-DDTHH:mm:ss');
    fetchSchedules(startOfMonth, endOfMonth);
  };
  
  // Fetch initial data
  useEffect(() => {
    const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DDTHH:mm:ss');
    const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DDTHH:mm:ss');
    fetchSchedules(startOfMonth, endOfMonth);
  }, [fetchSchedules]);

  const onSelect = (newValue: Dayjs) => {
    setSelectedDate(newValue.format('YYYY-MM-DD'));
    // No need to fetch schedules here, fetchSchedules is called on month change via onPanelChange
  };

  const handleOpenScheduleModal = (schedule: Schedule | null) => {
    setEditingSchedule(schedule);
    setIsScheduleModalOpen(true);
  };

  const handleCloseScheduleModal = () => {
    setIsScheduleModalOpen(false);
    setEditingSchedule(null);
  };

  const handleScheduleFormSubmit = (values: any) => {
    const scheduleData: ScheduleCreate = {
        title: values.title,
        description: values.description,
        start_datetime: values.dateTimeRange[0].format('YYYY-MM-DDTHH:mm:ss'),
        end_datetime: values.dateTimeRange[1].format('YYYY-MM-DDTHH:mm:ss'),
    };

    if (editingSchedule) {
        editSchedule(editingSchedule.id, scheduleData);
    } else {
        addSchedule(scheduleData);
    }
    handleCloseScheduleModal();
  };


  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const listData = schedules.filter(item => dayjs(item.start_datetime).format('YYYY-MM-DD') === dateStr);
    return (
      <ul className="events" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {listData.map(item => (
          <li key={item.id}>
            {/* Improved Badge for completion indicator */}
            <Badge 
                status={item.is_completed ? 'success' : 'processing'} 
                text={<Text type={item.is_completed ? 'secondary' : undefined} delete={item.is_completed}>{item.title}</Text>} 
            />
          </li>
        ))}
      </ul>
    );
  };

  const selectedDaySchedules = schedules.filter(
    (item) => dayjs(item.start_datetime).format('YYYY-MM-DD') === selectedDate
  ).sort((a,b) => dayjs(a.start_datetime).valueOf() - dayjs(b.start_datetime).valueOf());

  const renderTimetable = () => {
    if (selectedDaySchedules.length === 0) {
      return <div style={{ textAlign: 'center', padding: '20px' }}><Text type="secondary">No schedules for this day.</Text></div>;
    }

    const hoursOfDay = Array.from({ length: 24 }, (_, i) => i); // 0 to 23 hours

    return (
      <div 
        style={{ 
          display: 'grid',
          gridTemplateColumns: '40px 1fr', // 40px for time, 1fr for events
          gridTemplateRows: `repeat(48, 1fr)`, // 48 half-hour rows for 24 hours
          height: '600px', // Fixed height for the grid container
          border: '1px solid #f0f0f0', 
          borderRadius: '4px', 
          overflowY: 'auto', // Allow scrolling for events exceeding 600px
          background: '#fff',
          gap: '1px', // Gap between grid rows/columns
        }}
      >
        {/* Time markers */}
        {hoursOfDay.map(hour => (
          <div 
            key={`time-${hour}`} 
            style={{
              gridColumn: 1,
              gridRow: `${(hour * 2) + 1} / span 2`, // Span two half-hour rows for each hour
              borderBottom: '1px dashed #e8e8e8',
              fontSize: '10px',
              color: '#8c8c8c',
              paddingRight: '5px',
              textAlign: 'right',
              boxSizing: 'border-box',
              zIndex: 0,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'flex-end',
              position: 'sticky', // Make time labels sticky
              top: 0,
              background: '#fff',
            }}
          >
            {dayjs().hour(hour).minute(0).format('HH:mm')}
          </div>
        ))}
        {/* Schedule Events */}
        {selectedDaySchedules.map(item => {
          const start = dayjs(item.start_datetime);
          const end = dayjs(item.end_datetime);

          // Calculate grid row based on half-hour intervals
          const startRow = (start.hour() * 2) + (start.minute() >= 30 ? 1 : 0) + 1; // +1 because grid rows are 1-indexed
          const endRow = (end.hour() * 2) + (end.minute() >= 30 ? 1 : 0) + 1;
          const span = Math.max(1, endRow - startRow); // Ensure at least one row span

          return (
            <Tooltip
                key={item.id}
                title={
                    <div style={{ padding: '4px 0' }}>
                        <Text strong style={{ color: 'white' }}>{item.title}</Text><br/>
                        {item.description && <Text style={{ color: 'white' }}>{item.description}</Text>}<br/>
                        <Text style={{ color: 'white' }}>{start.format('MMM D, HH:mm')} - {end.format('HH:mm')}</Text>
                        {item.is_ai_generated && (<><br/><Tag color="blue" style={{ marginTop: '4px' }}>AI Generated</Tag></>)}
                        {item.is_completed && (<><br/><Tag color="green" style={{ marginTop: '4px' }}>Completed</Tag></>)}
                    </div>
                }
            >
                <div
                className={item.is_completed ? 'schedule-item-completed' : ''} // Apply CSS class for completed
                style={{
                    gridColumn: 2, // Always in the second column
                    gridRow: `${startRow} / span ${span}`,
                    backgroundColor: item.is_completed ? '#e6f7ff' : '#bae7ff', // Lighter background for completed
                    color: '#000', // Black text for readability
                    borderRadius: '3px',
                    padding: '4px 8px', // General padding
                    fontSize: '13px',
                    overflow: 'hidden',
                    zIndex: 1,
                    cursor: 'pointer',
                    borderLeft: item.is_completed ? '4px solid #52c41a' : '4px solid #1890ff',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    display: 'flex',
                    flexDirection: 'column', // Content flows in a column
                    justifyContent: 'center', // Vertically center all content
                    opacity: item.is_completed ? 0.8 : 1,
                    transition: 'all 0.2s',
                    position: 'relative', // Added for absolute positioning of AI tag and buttons
                    margin: '2px 0', // Small vertical margin to prevent collision with grid lines
                }}
                onClick={() => toggleScheduleStatus(item.id, !item.is_completed)} // Toggle status on click
                onContextMenu={(e) => {
                    e.preventDefault();
                    handleOpenScheduleModal(item);
                }}
                >
                <div style={{ display: 'flex', alignItems: 'baseline', flexShrink: 0 }}> {/* Row for title and time */}
                    <Text strong ellipsis={true} style={{ color: item.is_completed ? '#8c8c8c' : '#000', fontSize: '12px', flexShrink: 1, lineHeight: '1.2' }}> {/* Smaller title */}
                        {item.title}
                    </Text>
                    <Text style={{ color: item.is_completed ? '#8c8c8c' : '#000', fontSize: '9px', marginLeft: '5px', flexShrink: 0, lineHeight: '1.2' }}> {/* Smaller time, moved to right */}
                        {start.format('HH:mm')} - {end.format('HH:mm')}
                    </Text>
                </div>
                {/* No description now */}
                
                {/* No AI Tag anymore */}
                
                {/* Always visible action buttons at bottom right */}
                <Space size="small" style={{ position: 'absolute', bottom: '4px', right: '4px', background: 'rgba(255,255,255,0.8)', borderRadius: '4px', padding: '0 2px' }}>
                    <Tooltip title="Edit">
                        <Button 
                            size="small" 
                            type="text" 
                            icon={<EditOutlined style={{ color: '#1890ff' }} />} 
                            onClick={(e) => { e.stopPropagation(); handleOpenScheduleModal(item); }} 
                        />
                    </Tooltip>
                    <Tooltip title="Delete">
                        <Popconfirm
                            title="Delete this schedule?"
                            onConfirm={(e) => { e?.stopPropagation(); removeSchedule(item.id); }}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button 
                                size="small" 
                                type="text" 
                                danger 
                                icon={<DeleteOutlined />} 
                                onClick={(e) => e.stopPropagation()} // Prevent toggle status when clicking delete
                            />
                        </Popconfirm>
                    </Tooltip>
                </Space>
                </div>
            </Tooltip>
          );
        })}
      </div>
    );
  };


  const cardTitle = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <Title 
            level={4} 
            style={{ 
                margin: 0, 
                flex: 1, 
                minWidth: 0, 
                overflow: 'hidden', 
                whiteSpace: 'nowrap', 
                textOverflow: 'ellipsis' 
            }}
        >
            Schedules for {dayjs(selectedDate).format('MMMM D, YYYY')}
        </Title>
        <Space>
            <Tooltip title="Add schedule manually">
                <Button icon={<PlusOutlined />} onClick={() => handleOpenScheduleModal(null)} />
            </Tooltip>
             <Tooltip title="Get AI schedule recommendations">
                <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => setIsAIModalOpen(true)} />
            </Tooltip>
        </Space>
    </div>
  );

  return (
    <>
        <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
            <Card title="My Calendar">
            <Calendar 
                onPanelChange={onPanelChange} 
                onSelect={onSelect}
                dateCellRender={dateCellRender} 
            />
            </Card>
        </Col>
        <Col xs={24} lg={8}>
            <Card title={cardTitle}>
                {renderTimetable()}
            </Card>
        </Col>
        </Row>
        <ScheduleModal 
            isOpen={isScheduleModalOpen}
            onClose={handleCloseScheduleModal}
            onSubmit={handleScheduleFormSubmit}
            initialData={editingSchedule}
        />
        <AIRecommenderModal 
            isOpen={isAIModalOpen}
            onClose={() => setIsAIModalOpen(false)}
            onAddSchedule={addSchedule}
            onBulkAdd={bulkAddSchedules}
        />
    </>
  );
};

export default SchedulerPage;