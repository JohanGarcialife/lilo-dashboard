import React, { useState, useEffect, useMemo } from 'react';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { firebaseApp } from '@/utils/firebase';
import {
    Typography, Box,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Chip,
    Button,
    TableSortLabel,
    TablePagination,
    Avatar
} from '@mui/material';
import DashboardCard from '@/app/(DashboardLayout)//components/shared/DashboardCard';
import EditDriverModal from './EditDriverModal';
// import EditDriverModal from './EditDriverModal'; 

export interface Driver {
    uid: string;
    criminalRecordImageUrl: string;
    dniImageUrl: string;
    dniNumber: string;
    isConductor: boolean;
    isConductorActive: boolean;
    isUserVerified: boolean;
    licenseImageUrl: string;
    licenseNumber: string;
    licensePlate: string;
    pendingVerified: boolean;
    phoneNumber: string;
    phoneVerified: boolean;
    profileImageUrl: string;
    updatedAt: any; // Using 'any' for Firestore Timestamp for simplicity
    userId: string;
    vehicleBrand: string;
    vehicleModel: string;
}

type Order = 'asc' | 'desc';

const Riders = () => {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [order, setOrder] = useState<Order>('asc');
    const [orderBy, setOrderBy] = useState<keyof Driver>('vehicleBrand');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const handleOpenModal = (driver: Driver) => {
        setSelectedDriver(driver);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedDriver(null);
        setIsModalOpen(false);
    };

    const handleRequestSort = (property: keyof Driver) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const fetchDrivers = async () => {
        setLoading(true);
        try {
            const db = getFirestore(firebaseApp);
            const driversCollectionRef = collection(db, "drivers");
            const q = query(driversCollectionRef, where("isUserVerified", "==", false));
            const querySnapshot = await getDocs(q);
           
            
            const fetchedDrivers: Driver[] = [];
            querySnapshot.forEach((doc) => {
                fetchedDrivers.push({
                    uid: doc.id,
                    ...doc.data()
                } as Driver);
            });
            setDrivers(fetchedDrivers);
        } catch (error) {
            console.error("Error fetching drivers:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleUpdateList = () => {
        fetchDrivers();
    };
 

    const sortedDrivers = useMemo(() => {
        const comparator = (a: Driver, b: Driver) => {
            if (b[orderBy] < a[orderBy]) {
                return order === 'asc' ? 1 : -1;
            }
            if (b[orderBy] > a[orderBy]) {
                return order === 'asc' ? -1 : 1;
            }
            return 0;
        };
        return [...drivers].sort(comparator);
    }, [drivers, order, orderBy]);

    const visibleRows = useMemo(
        () =>
            sortedDrivers.slice(
                page * rowsPerPage,
                page * rowsPerPage + rowsPerPage,
            ),
        [sortedDrivers, page, rowsPerPage],
    );

    if (loading) {
        return <Typography>Cargando conductores...</Typography>;
    }

    return (
        <>
            <DashboardCard title="Conductores sin verificar
            ">
                <Box sx={{ overflow: 'auto', width: { xs: '280px', sm: 'auto' } }}>
                    <Table
                        aria-label="simple table"
                        sx={{
                            whiteSpace: "nowrap",
                            mt: 2
                        }}
                    >
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        Foto
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === 'dniNumber'}
                                        direction={orderBy === 'dniNumber' ? order : 'asc'}
                                        onClick={() => handleRequestSort('dniNumber')}
                                    >
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            DNI
                                        </Typography>
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === 'vehicleBrand'}
                                        direction={orderBy === 'vehicleBrand' ? order : 'asc'}
                                        onClick={() => handleRequestSort('vehicleBrand')}
                                    >
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            Vehículo
                                        </Typography>
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        Placa
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        Verificado
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        Acciones
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visibleRows.map((driver) => (
                                <TableRow key={driver.uid}>
                                    <TableCell>
                                        <Avatar src={driver.profileImageUrl} alt={driver.dniNumber} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="subtitle2" fontWeight={600}>
                                            {driver.dniNumber}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography color="textSecondary" variant="subtitle2" fontWeight={400}>
                                            {driver.vehicleBrand} {driver.vehicleModel}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="subtitle2">
                                            {driver.licensePlate}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            color={driver.isUserVerified ? 'success' : 'warning'}
                                            size="small"
                                            label={driver.isUserVerified ? 'Verificado' : 'Pendiente'}
                                        ></Chip>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button variant="contained" color="primary" onClick={() => handleOpenModal(driver)}>
                                            Editar
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Box>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={drivers.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </DashboardCard>
            {selectedDriver && (
                <EditDriverModal
                    open={isModalOpen}
                    onClose={handleCloseModal}
                    driver={selectedDriver}
                    onUpdate={handleUpdateList}
                />
            )}
        </>
    );
};

export default Riders;
