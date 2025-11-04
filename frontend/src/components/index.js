/**
 * Central export file for reusable components
 * Import components from here for consistent usage across the app
 * 
 * Usage:
 * import { Button, Input, Card } from '../components';
 */

// Shared components
export { default as Button } from './shared/Button';
export { default as Input } from './shared/Input';
export { default as Card } from './shared/Card';
export { default as Modal } from './shared/Modal';
export { default as LoadingSpinner } from './shared/LoadingSpinner';
export { default as Alert } from './shared/Alert';

// Auth components (create these as needed)
// export { default as LoginForm } from './auth/LoginForm';
// export { default as SignupForm } from './auth/SignupForm';

// Patient components (create these as needed)
// export { default as HealthMetricCard } from './patient/HealthMetricCard';
// export { default as MetricChart } from './patient/MetricChart';

// Doctor components (create these as needed)
// export { default as PatientCard } from './doctor/PatientCard';
// export { default as PatientList } from './doctor/PatientList';