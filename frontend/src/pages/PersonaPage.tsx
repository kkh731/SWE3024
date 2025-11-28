import React from 'react';
import { Form, Input, Button, Card, Typography, Row, Col, Select, Spin, message } from 'antd';
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

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const PersonaPage: React.FC = () => {
    const { savePersona, isLoading, persona } = usePersonaStore();
    const [form] = Form.useForm();

    const onFinish = async (values: any) => {
        const personaData: PersonaCreate = {
            persona_text: values.persona_text,
            preferred_times: values.preferred_times,
            focus_duration: values.focus_duration,
            location: values.location,
        };
        const success = await savePersona(personaData);
        if (success) {
            message.success('Persona saved successfully!');
        } else {
            message.error('Failed to save persona.');
        }
    };
    
    // If a persona exists, pre-fill the form.
    // It runs only once when the component mounts and persona is available.
    React.useEffect(() => {
        if(persona) {
            form.setFieldsValue({
                ...persona,
                preferred_times: persona.preferred_times || [],
            });
        }
    }, [persona, form]);

    return (
        <Row justify="center" align="middle" style={{ paddingTop: '2rem' }}>
            <Col xs={24} sm={20} md={16} lg={12} xl={10}>
                <Card>
                    <Title level={2}>My Persona</Title>
                    <Text type="secondary">Tell the AI about yourself for better recommendations. Your persona can be updated at any time.</Text>
                    
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFinish}
                        initialValues={persona || {
                            persona_text: '',
                            preferred_times: [],
                            location: '',
                            focus_duration: undefined,
                        }}
                        style={{ marginTop: '2rem' }}
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
                        
                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={isLoading} block size="large">
                                {persona ? 'Update' : 'Save'} Persona
                            </Button>
                        </Form.Item>
                    </Form>
                </Card>
            </Col>
        </Row>
    );
};

export default PersonaPage;
