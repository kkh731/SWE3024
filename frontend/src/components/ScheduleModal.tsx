import React, { useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Button } from 'antd';
import dayjs from 'dayjs';

// --- Start of Local Type Definitions ---
// Type is defined locally to bypass a persistent module resolution/caching issue.
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
// --- End of Local Type Definitions ---

interface ScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (values: any) => void;
    initialData: Partial<Schedule> | null;
}

const { RangePicker } = DatePicker;

const ScheduleModal: React.FC<ScheduleModalProps> = ({ isOpen, onClose, onSubmit, initialData }) => {
    const [form] = Form.useForm();
    
    useEffect(() => {
        if (initialData) {
            form.setFieldsValue({
                title: initialData.title,
                description: initialData.description,
                dateTimeRange: [
                    initialData.start_datetime ? dayjs(initialData.start_datetime) : null,
                    initialData.end_datetime ? dayjs(initialData.end_datetime) : null
                ]
            });
        } else {
            form.resetFields();
        }
    }, [initialData, form, isOpen]);

    const handleFormSubmit = () => {
        form.validateFields().then(values => {
            onSubmit(values);
            onClose();
        });
    };

    return (
        <Modal
            title={initialData ? "Edit Schedule" : "Add New Schedule"}
            open={isOpen}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" onClick={handleFormSubmit}>
                    Submit
                </Button>,
            ]}
        >
            <Form form={form} layout="vertical" name="schedule_form">
                <Form.Item
                    name="title"
                    label="Title"
                    rules={[{ required: true, message: 'Please input the title of the schedule!' }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    name="description"
                    label="Description"
                >
                    <Input.TextArea rows={4} />
                </Form.Item>
                <Form.Item
                    name="dateTimeRange"
                    label="Start & End Time"
                    rules={[{ required: true, message: 'Please select the time range!' }]}
                >
                    <RangePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }}/>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default ScheduleModal;
