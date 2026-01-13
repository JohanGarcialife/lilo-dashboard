'use client';
import { Typography } from '@mui/material';
import PageContainer from '@/app/(DashboardLayout)/components/container/PageContainer';
import DashboardCard from '@/app/(DashboardLayout)/components/shared/DashboardCard';
import ListOffPassengers from '../_components/ListOffPassengers';


const SamplePage = () => {
  return (
    <PageContainer title="Not Active Passengers" description="Passengers with not active status">
     
        <ListOffPassengers />
      
    </PageContainer>
  );
};

export default SamplePage;

