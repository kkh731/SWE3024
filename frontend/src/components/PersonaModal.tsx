import React, { useEffect } from 'react';
import { Modal, Form, Input, Button, Select, message } from 'antd';
import { usePersonaStore } from '../store/personaStore';
// import { PersonaCreate } from '../api'; // Removed due to module resolution issues

// --- Start of Local Type Definitions ---
// Type is defined locally to bypass a persistent module resolution/caching issue.
export interface PersonaCreate {
  persona_text: string;
  preferred_times?: string[];
  focus_duration?: string;
  location?: string;
}
// --- End of Local Type Definitions ---

const { TextArea } = Input;
const { Option } = Select;

interface PersonaModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const PersonaModal: React.FC<PersonaModalProps> = ({ isOpen, onClose }) => {
    const { persona, savePersona, isLoading } = usePersonaStore();
    const [form] = Form.useForm();

    useEffect(() => {
        if (persona) {
            form.setFieldsValue({
                ...persona,
                preferred_times: persona.preferred_times || [],
            });
        } else {
            // Reset fields if no persona exists or modal is opened for a new one
            form.resetFields();
        }
    }, [persona, form, isOpen]); // Re-run effect when modal opens/closes to reset form

    const onFinish = async (values: any) => {
        const personaData: PersonaCreate = {
            persona_text: values.persona_text,
            preferred_times: values.preferred_times,
            focus_duration: values.focus_duration,
            location: values.location,
        };
        const success = await savePersona(personaData);
        if (success) {
            message.success('Persona updated successfully!');
            onClose();
        } else {
            message.error('Failed to update persona.');
        }
    };

    return (
        <Modal
            title="Manage Your Persona"
            open={isOpen}
            onCancel={onClose}
            footer={[
                <Button key="back" onClick={onClose}>
                    Cancel
                </Button>,
                <Button key="submit" type="primary" loading={isLoading} onClick={() => form.submit()}>
                    Save
                </Button>,
            ]}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={onFinish}
            >
                <Form.Item
                    name="persona_text"
                    label="About You"
                    rules={[{ required: true, message: 'Please tell us something about yourself.' }]}
                    tooltip="Describe your general routine, goals, and personality. The more detail, the better!"
                >
                    <TextArea rows={4} placeholder="e.g., A software developer who works from home and wants to exercise more." />
                </Form.Item>

                <Form.Item name="preferred_times" label="Preferred Times for Activities">
                    <Select mode="multiple" allowClear placeholder="Select your preferred times">
                        <Option value="morning">Morning (6am-12pm)</Option>
                        <Option value="afternoon">Afternoon (12pm-5pm)</Option>
                        <Option value="evening">Evening (5pm-9pm)</Option>
                        <Option value="night">Night (9pm-12am)</Option>
                    </Select>
                </Form.Item>
                
                <Form.Item name="focus_duration" label="Typical Focus Duration">
                    <Select allowClear placeholder="How long can you usually focus on a single task?">
                        <Option value="30min">30 minutes</Option>
                        <Option value="1hour">1 hour</Option>
                        <Option value="1.5hour">1.5 hours</Option>
                        <Option value="2hour+">2 hours or more</Option>
                    </Select>
                </Form.Item>

                <Form.Item name="location" label="Your Location" tooltip="Providing a location helps the AI with context-aware suggestions (e.g., weather, local events).">
                    <Input placeholder="e.g., Seoul, Korea" />
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default PersonaModal;