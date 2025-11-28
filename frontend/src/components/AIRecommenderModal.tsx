import React, { useState } from 'react';
import { Modal, Form, Input, Button, DatePicker, List, Typography, Spin, Alert, message } from 'antd';
// import { AIRecommendation, AIRecommendationResponse, ScheduleCreate, ScheduleBulkCreateItemInput } from '../api'; // Removed due to module resolution issues
import * as api from '../api';
import dayjs from 'dayjs';

// --- Start of Local Type Definitions ---
// Types are defined locally to bypass a persistent module resolution/caching issue.
export interface AIRecommendation {
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  reason: string;
}

export interface AIRecommendationResponse {
  schedules: AIRecommendation[];
  summary: string;
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


const { RangePicker } = DatePicker;
const { Text } = Typography;

interface AIRecommenderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSchedule: (schedule: ScheduleCreate) => void;
    onBulkAdd: (schedules: ScheduleBulkCreateItemInput[]) => void;
}

const AIRecommenderModal: React.FC<AIRecommenderModalProps> = ({ isOpen, onClose, onAddSchedule, onBulkAdd }) => {
    const [form] = Form.useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<AIRecommendationResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFormSubmit = async (values: any) => {
        setIsLoading(true);
        setError(null);
        setResult(null);
        try {
            const response = await api.getAIRecommendations(
                values.prompt,
                values.dateRange[0].format('YYYY-MM-DD'),
                values.dateRange[1].format('YYYY-MM-DD')
            );
            setResult(response.data);
        } catch (err) {
            setError('Failed to get recommendations from the AI. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAddClick = (rec: AIRecommendation) => {
        const newSchedule: ScheduleCreate = {
            title: rec.title,
            description: rec.reason,
            start_datetime: dayjs(`${rec.date} ${rec.start_time}`).format('YYYY-MM-DDTHH:mm:ss'),
            end_datetime: dayjs(`${rec.date} ${rec.end_time}`).format('YYYY-MM-DDTHH:mm:ss'),
        };
        onAddSchedule(newSchedule);
        message.success(`Added "${rec.title}" to your schedule.`);
    };

    const handleBulkAddClick = () => {
        if (result?.schedules) {
            onBulkAdd(result.schedules);
            message.success('Added all recommended schedules!');
            handleClose();
        }
    }
    
    const handleClose = () => {
        // Reset state on close
        setResult(null);
        setError(null);
        form.resetFields();
        onClose();
    }

    const modalFooter = [
        <Button key="back" onClick={handleClose}>
            Close
        </Button>,
    ];

    if (result?.schedules && result.schedules.length > 0) {
        modalFooter.push(
            <Button key="add_all" type="primary" onClick={handleBulkAddClick}>
                Add All to Calendar
            </Button>
        );
    }


    return (
        <Modal
            title="AI Schedule Recommender"
            open={isOpen}
            onCancel={handleClose}
            width={600}
            footer={modalFooter}
        >
            <Form 
                form={form} 
                layout="vertical" 
                onFinish={handleFormSubmit}
                initialValues={{
                    dateRange: [dayjs(), dayjs().add(7, 'day')]
                }}
            >
                <Form.Item
                    name="prompt"
                    label="What would you like to do?"
                    rules={[{ required: true, message: 'Please enter a prompt for the AI!' }]}
                >
                    <Input.TextArea rows={3} placeholder="e.g., 'I want to go jogging three times this week' or 'Find time to study for my exam'"/>
                </Form.Item>
                <Form.Item
                    name="dateRange"
                    label="Recommend for which dates?"
                    rules={[{ required: true, message: 'Please select a date range!' }]}
                >
                    <RangePicker style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={isLoading} block>
                        Get Recommendations
                    </Button>
                </Form.Item>
            </Form>
            {isLoading && <div style={{ textAlign: 'center' }}><Spin /></div>}
            {error && <Alert message={error} type="error" showIcon />}
            {result && (
                <div>
                    <Typography.Title level={5}>AI Suggestions:</Typography.Title>
                    <Text type="secondary">{result.summary}</Text>
                    <List
                        style={{ marginTop: '1rem' }}
                        dataSource={result.schedules}
                        renderItem={(rec) => (
                            <List.Item
                                actions={[<Button size="small" onClick={() => handleAddClick(rec)}>Add</Button>]}
                            >
                                <List.Item.Meta
                                    title={rec.title}
                                    description={`${dayjs(rec.date).format('MMM D, YYYY')} from ${rec.start_time} to ${rec.end_time}`}
                                />
                            </List.Item>
                        )}
                    />
                </div>
            )}
        </Modal>
    );
};

export default AIRecommenderModal;
