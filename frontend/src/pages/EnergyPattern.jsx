import React from 'react';
import { Pane, Paragraph, Heading, Checkbox } from 'evergreen-ui';
import { Sun, Sunrise, Sunset, Moon, Flower } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CenteredPane from '../components/CentredPane';
import OnboardingNav from '../components/OnboardingNav';

const EnergyPattern = ({ formData, setFormData }) => {
  const navigate = useNavigate();
  const handleEnergyChange = (value) => {
    setFormData(prevData => {
      const currentPatterns = prevData.energy_patterns || [];
      const updatedPatterns = currentPatterns.includes(value)
        ? currentPatterns.filter(pattern => pattern !== value)
        : [...currentPatterns, value];
      
      return {
        ...prevData,
        energy_patterns: updatedPatterns
      };
    });
  };

  const handleNext = () => {
    navigate('/priorties');
  };

  const handlePrevious = () => {
    navigate('/tasks');
  };

  const energyOptions = [
    { value: 'high_all_day', label: 'High-Full of energy during the day', icon: Flower },
    { value: 'peak_morning', label: 'Energy peaks in the morning', icon: Sunrise },
    { value: 'peak_afternoon', label: 'Energy peaks in the afternoon', icon: Sun },
    { value: 'peak_evening', label: 'Energy peaks in the evening', icon: Sunset },
    { value: 'low_energy', label: 'Low energy, need help increasing', icon: Moon },
  ];

  return (
    <CenteredPane>
      <Pane>
        <Heading size={700} marginBottom={16}>How's your energy during the day?</Heading>
        <Paragraph marginBottom={24}>
          Understanding your unique energy patterns helps us create a schedule that maximizes your productivity.
        </Paragraph>
        <Paragraph marginBottom={24}>
          Select all that apply:
        </Paragraph>
        <Pane display="flex" justifyContent="space-between" flexWrap="wrap">
          {energyOptions.map((option) => (
            <Pane
              key={option.value}
              background="tint2"
              borderRadius={8}
              padding={16}
              width="19%"
              marginBottom={16}
              display="flex"
              flexDirection="column"
              alignItems="center"
              textAlign="center"
            >
              <option.icon size={32} style={{ marginBottom: 12 }} />
              <Paragraph marginBottom={12} lineHeight={1.2}>{option.label}</Paragraph>
              <Checkbox
                checked={(formData.energy_patterns || []).includes(option.value)}
                onChange={() => handleEnergyChange(option.value)}
              />
            </Pane>
          ))}
        </Pane>
      </Pane>
      <OnboardingNav onBack={handlePrevious} onNext={handleNext} />
    </CenteredPane>
  );
};

export default EnergyPattern;