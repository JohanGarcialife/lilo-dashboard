"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Drawer,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import {
  IconPlus,
  IconSearch,
  IconMapPin,
  IconCar,
  IconUser,
  IconPackage,
  IconCheck,
  IconPlayerPlay,
  IconX,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import PageContainer from "@/app/(DashboardLayout)/components/container/PageContainer";
import DashboardCard from "@/app/(DashboardLayout)/components/shared/DashboardCard";
import StatusBadge from "../_components/StatusBadge";
import {
  B2BCompany,
  B2BRequestStatus,
  B2BServiceRequest,
  B2BVehicle,
} from "@/types/b2b";
import {
  subscribeToB2BCompanies,
  subscribeToB2BRequests,
  subscribeToB2BVehicles,
  assignB2BRequestVehicleAndDriver,
  updateB2BRequestStatus,
  cancelB2BCompanyReservation,
  withdrawB2BDriverAvailability,
} from "@/services/b2b";

const LIFECYCLE_STEPS: Array<{ status: B2BRequestStatus; label: string }> = [
  { status: "requested", label: "Solicitada" },
  { status: "seeking_driver", label: "Buscando Conductor" },
  { status: "confirmed", label: "Confirmada" },
  { status: "assigned", label: "Conductor Asignado" },
  { status: "enRoute", label: "En Camino al Origen" },
  { status: "driverArrived", label: "Conductor en Punto" },
  { status: "inService", label: "En Curso (Viajando)" },
  { status: "arrived", label: "Llegada a Destino" },
  { status: "completed", label: "Completado" },
];

const B2BSolicitudesPage = () => {
  const router = useRouter();
  const [requests, setRequests] = useState<B2BServiceRequest[]>([]);
  const [companies, setCompanies] = useState<B2BCompany[]>([]);
  const [vehicles, setVehicles] = useState<B2BVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Drawer de Monitoreo en Tiempo Real (H2.5-FE)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(
    null
  );
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const unsubReqs = subscribeToB2BRequests(
      (data) => {
        setRequests(data);
        setLoading(false);
      },
      undefined,
      () => setLoading(false)
    );
    const unsubComps = subscribeToB2BCompanies((data) => setCompanies(data));
    const unsubVehs = subscribeToB2BVehicles((data) => setVehicles(data));

    return () => {
      unsubReqs();
      unsubComps();
      unsubVehs();
    };
  }, []);

  const activeRequest = useMemo(
    () => requests.find((r) => r.id === selectedRequestId) || null,
    [requests, selectedRequestId]
  );

  useEffect(() => {
    if (activeRequest?.assignedVehicleId) {
      setSelectedVehicleId(activeRequest.assignedVehicleId);
    } else {
      setSelectedVehicleId("");
    }
  }, [activeRequest]);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (req.folio || "").toLowerCase().includes(q) ||
        (req.companyName || "").toLowerCase().includes(q) ||
        (req.origin?.address || "").toLowerCase().includes(q) ||
        (req.destination?.address || "").toLowerCase().includes(q) ||
        (req.assignedDriverName || "").toLowerCase().includes(q);

      const matchesCompany =
        companyFilter === "all" || req.companyId === companyFilter;
      const matchesStatus =
        statusFilter === "all" || req.status === statusFilter;

      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [requests, searchTerm, companyFilter, statusFilter]);

  const compatibleVehicles = useMemo(() => {
    if (!activeRequest) return [];
    return vehicles.filter(
      (v) =>
        v.status === "active" &&
        (v.category === activeRequest.vehicleCategory ||
          v.maxPassengers >= activeRequest.passengersCount)
    );
  }, [vehicles, activeRequest]);

  const handleAssignVehicle = async () => {
    if (!activeRequest || !selectedVehicleId) return;
    const veh = vehicles.find((v) => v.id === selectedVehicleId);
    if (!veh) return;

    setUpdating(true);
    try {
      await assignB2BRequestVehicleAndDriver(activeRequest.id, {
        driverId: veh.driverId || `drv${veh.id}`,
        driverName: veh.driverName || `Conductor ${veh.plate}`,
        driverPhone: veh.driverPhone || "+503 7000-0000",
        vehicleId: veh.id,
        vehiclePlate: veh.plate,
      });
      setFeedback({
        type: "success",
        message: `Unidad ${veh.plate} (${veh.driverName || "Conductor"}) asignada al traslado ${activeRequest.folio}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error al asignar unidad.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleTransitionStatus = async (nextStatus: B2BRequestStatus) => {
    if (!activeRequest) return;
    setUpdating(true);
    try {
      if (nextStatus === "cancelled") {
        const res = await cancelB2BCompanyReservation(
          activeRequest.id,
          activeRequest.tripId
        );
        setFeedback({
          type: "success",
          message: `Reserva corporativa ${activeRequest.folio} cancelada. Saldo liberado del techo: $${Number(
            res.releasedAmount || activeRequest.finalAmount || 0
          ).toFixed(2)} USD.`,
        });
      } else {
        await updateB2BRequestStatus(activeRequest.id, nextStatus);
        setFeedback({
          type: "success",
          message: `Estado del servicio ${activeRequest.folio} actualizado en tiempo real.`,
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error al actualizar estado.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDriverUnavailable = async () => {
    if (!activeRequest) return;
    setUpdating(true);
    try {
      await withdrawB2BDriverAvailability(
        activeRequest.id,
        activeRequest.tripId,
        activeRequest.assignedDriverId
      );
      setFeedback({
        type: "success",
        message: `Conductor desvinculado (${activeRequest.folio} → seeking_driver). El techo de consumo de la empresa permanece intacto.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Error al reportar baja de conductor.",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getActiveStepIndex = (status: B2BRequestStatus): number => {
    const idx = LIFECYCLE_STEPS.findIndex((s) => s.status === status);
    if (status === "invoiced") return LIFECYCLE_STEPS.length;
    return idx >= 0 ? idx : 0;
  };

  return (
    <PageContainer
      title="Solicitudes y Monitoreo B2B | Lilo El Salvador"
      description="Gestión y seguimiento en tiempo real de solicitudes de traslado corporativo"
    >
      <Box>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={2}
          mb={3}
        >
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Solicitudes y Monitoreo en Tiempo Real (H2.4 / H2.5)
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Seguimiento en vivo de estados (Solicitada → Asignada → En Camino → En Punto → En Curso → Completado)
            </Typography>
          </Box>

          <Button
            variant="contained"
            color="primary"
            startIcon={<IconPlus size={18} />}
            onClick={() => router.push("/Solicitudes/nueva")}
          >
            Nueva Solicitud de Traslado
          </Button>
        </Stack>

        {feedback && (
          <Alert
            severity={feedback.type}
            sx={{ mb: 3 }}
            onClose={() => setFeedback(null)}
          >
            {feedback.message}
          </Alert>
        )}

        <DashboardCard>
          <Box>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              mb={3}
              justifyContent="space-between"
            >
              <TextField
                placeholder="Buscar por folio, empresa, origen, destino o conductor..."
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ minWidth: { xs: "100%", md: 360 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <IconSearch size={18} />
                    </InputAdornment>
                  ),
                }}
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  label="Empresa"
                  size="small"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  sx={{ minWidth: 200 }}
                >
                  <MenuItem value="all">Todas las Empresas</MenuItem>
                  {companies.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.tradeName || c.legalName}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label="Estado"
                  size="small"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{ minWidth: 180 }}
                >
                  <MenuItem value="all">Todos los estados</MenuItem>
                  <MenuItem value="requested">Solicitada</MenuItem>
                  <MenuItem value="seeking_driver">Buscando Conductor</MenuItem>
                  <MenuItem value="assigned">Conductor Asignado</MenuItem>
                  <MenuItem value="enRoute">En Camino al Origen</MenuItem>
                  <MenuItem value="driverArrived">Conductor en Punto</MenuItem>
                  <MenuItem value="inService">En Curso</MenuItem>
                  <MenuItem value="completed">Completado</MenuItem>
                  <MenuItem value="cancelled">Cancelado</MenuItem>
                </TextField>
              </Stack>
            </Stack>

            {loading ? (
              <Box display="flex" justifyContent="center" py={6}>
                <CircularProgress />
              </Box>
            ) : filteredRequests.length === 0 ? (
              <Box textAlign="center" py={6}>
                <Typography variant="h6" color="textSecondary" gutterBottom>
                  No hay solicitudes de traslado registradas
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<IconPlus size={18} />}
                  onClick={() => router.push("/Solicitudes/nueva")}
                  sx={{ mt: 1 }}
                >
                  Crear Primera Solicitud B2B
                </Button>
              </Box>
            ) : (
              <TableContainer component={Paper} elevation={0}>
                <Table sx={{ minWidth: 920 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Folio / Modalidad</TableCell>
                      <TableCell>Empresa / Centro de Costo</TableCell>
                      <TableCell>Ruta & Paradas</TableCell>
                      <TableCell>Vehículo & Pasajeros</TableCell>
                      <TableCell>Conductor Asignado</TableCell>
                      <TableCell align="right">Tarifa USD</TableCell>
                      <TableCell align="center">Estado en Vivo</TableCell>
                      <TableCell align="right">Monitoreo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRequests.map((req) => (
                      <TableRow key={req.id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {req.folio}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {req.isImmediate ? "Inmediato" : "Programado"} ·{" "}
                            {req.roundTrip ? "Ida y Vuelta" : "Solo Ida"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {req.companyName}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {req.costCenterName || "General"}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography
                            variant="body2"
                            noWrap
                            sx={{ maxWidth: 240 }}
                          >
                            <strong>Origen:</strong> {req.origin?.address}
                          </Typography>
                          {req.stops && req.stops.length > 0 && (
                            <Typography
                              variant="caption"
                              color="primary.main"
                              display="block"
                            >
                              + {req.stops.length} parada(s) intermedia(s)
                            </Typography>
                          )}
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            noWrap
                            sx={{ maxWidth: 240, display: "block" }}
                          >
                            <strong>Destino:</strong> {req.destination?.address}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Chip
                            size="small"
                            color={
                              req.vehicleCategory === "microbus"
                                ? "warning"
                                : req.vehicleCategory === "pickup"
                                ? "secondary"
                                : "primary"
                            }
                            label={`${(
                              req.vehicleCategory || "suv"
                            ).toUpperCase()} · ${req.passengersCount} pax`}
                            sx={{ fontWeight: 600 }}
                          />
                          {req.hasCargo && (
                            <Typography
                              variant="caption"
                              color="warning.main"
                              display="block"
                              fontWeight={600}
                            >
                              Con Carga / Equipaje
                            </Typography>
                          )}
                        </TableCell>

                        <TableCell>
                          {req.assignedDriverName ? (
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {req.assignedDriverName}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                {req.assignedVehiclePlate} ·{" "}
                                {req.assignedDriverPhone}
                              </Typography>
                            </Box>
                          ) : (
                            <Chip
                              size="small"
                              label="Sin asignar"
                              color="warning"
                              variant="outlined"
                            />
                          )}
                        </TableCell>

                        <TableCell align="right">
                          <Typography variant="subtitle2" fontWeight={700}>
                            $
                            {Number(
                              req.finalAmount ??
                                req.tariffApplied?.calculatedAmount ??
                                0
                            ).toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {req.estimatedDistanceKm} km
                          </Typography>
                        </TableCell>

                        <TableCell align="center">
                          <StatusBadge status={req.status} type="request" />
                        </TableCell>

                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setSelectedRequestId(req.id)}
                          >
                            Monitorear
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DashboardCard>
      </Box>

      {/* Drawer de Monitoreo en Tiempo Real y Despacho (H2.5-FE) */}
      <Drawer
        anchor="right"
        open={Boolean(activeRequest)}
        onClose={() => setSelectedRequestId(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 520 }, p: 3 } }}
      >
        {activeRequest && (
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Box>
                <Typography variant="h5" fontWeight={700}>
                  {activeRequest.folio}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {activeRequest.companyName} · CC:{" "}
                  {activeRequest.costCenterName || "General"}
                </Typography>
              </Box>
              <StatusBadge status={activeRequest.status} type="request" />
            </Stack>

            <Divider sx={{ mb: 2.5 }} />

            {/* Stepper de Estado en Tiempo Real */}
            <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
              Línea de Tiempo en Vivo (Sincronizada con Firestore)
            </Typography>
            <Card variant="outlined" sx={{ mb: 3, bgcolor: "#f8fafc" }}>
              <CardContent>
                <Stepper
                  activeStep={getActiveStepIndex(activeRequest.status)}
                  orientation="vertical"
                >
                  {LIFECYCLE_STEPS.map((step) => (
                    <Step key={step.status}>
                      <StepLabel>{step.label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>

            {/* Asignación de Conductor + Unidad */}
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              Despacho: Asignar Unidad y Conductor ({activeRequest.vehicleCategory.toUpperCase()})
            </Typography>
            <Stack direction="row" spacing={1.5} mb={3}>
              <TextField
                select
                fullWidth
                size="small"
                label="Unidad Compatible Disponible"
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
              >
                <MenuItem value="">-- Seleccionar unidad --</MenuItem>
                {compatibleVehicles.map((v) => (
                  <MenuItem key={v.id} value={v.id}>
                    {v.plate} · {v.brand} {v.model} ({v.category.toUpperCase()}) —{" "}
                    {v.driverName || "Sin conductor"}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                variant="contained"
                disabled={!selectedVehicleId || updating}
                onClick={handleAssignVehicle}
              >
                Asignar
              </Button>
            </Stack>

            {/* Controles de transición de estado en tiempo real */}
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              Actualizar Estado Operativo en Tiempo Real
            </Typography>
            <Grid container spacing={1} mb={3}>
              <Grid size={{ xs: 6 }}>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<IconPlayerPlay size={15} />}
                  disabled={updating}
                  onClick={() => handleTransitionStatus("enRoute")}
                >
                  En Camino al Origen
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  startIcon={<IconMapPin size={15} />}
                  disabled={updating}
                  onClick={() => handleTransitionStatus("driverArrived")}
                >
                  Conductor en Punto
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  color="info"
                  startIcon={<IconCar size={15} />}
                  disabled={updating}
                  onClick={() => handleTransitionStatus("inService")}
                >
                  Iniciar Viaje (En Curso)
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  fullWidth
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<IconCheck size={15} />}
                  disabled={updating}
                  onClick={() => handleTransitionStatus("completed")}
                >
                  Marcar Completado
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  color="warning"
                  disabled={updating}
                  onClick={handleDriverUnavailable}
                >
                  Baja Conductor (`seeking_driver`)
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button
                  fullWidth
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<IconX size={15} />}
                  disabled={updating}
                  onClick={() => handleTransitionStatus("cancelled")}
                >
                  Cancelar Reserva (Liberar Techo)
                </Button>
              </Grid>
            </Grid>

            <Divider sx={{ mb: 2 }} />

            {/* Detalles de Ruta, Paradas, Pasajeros y Tarifa */}
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="textSecondary">
                  ORIGEN
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {activeRequest.origin?.address}
                </Typography>
              </Box>

              {activeRequest.stops && activeRequest.stops.length > 0 && (
                <Box>
                  <Typography variant="caption" color="primary.main" fontWeight={700}>
                    PARADAS INTERMEDIAS ({activeRequest.stops.length})
                  </Typography>
                  {activeRequest.stops.map((st, idx) => (
                    <Typography key={idx} variant="body2">
                      {idx + 1}. {st.address}
                    </Typography>
                  ))}
                </Box>
              )}

              <Box>
                <Typography variant="caption" color="textSecondary">
                  DESTINO ({activeRequest.roundTrip ? "IDA Y VUELTA" : "SOLO IDA"})
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {activeRequest.destination?.address}
                </Typography>
              </Box>

              <Stack direction="row" spacing={2}>
                <Box flex={1}>
                  <Typography variant="caption" color="textSecondary">
                    PASAJEROS ({activeRequest.passengersCount})
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {(activeRequest.passengerNames || []).join(", ") ||
                      activeRequest.requestedByName}
                  </Typography>
                </Box>
                <Box flex={1}>
                  <Typography variant="caption" color="textSecondary">
                    CARGA / EQUIPAJE
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {activeRequest.hasCargo
                      ? activeRequest.cargoDescription || "Sí incluye carga"
                      : "Sin carga especial"}
                  </Typography>
                </Box>
              </Stack>

              <Alert severity="success" sx={{ mt: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Tarifa Oficial Aplicada: $
                  {Number(
                    activeRequest.finalAmount ??
                      activeRequest.tariffApplied?.calculatedAmount ??
                      0
                  ).toFixed(2)}{" "}
                  USD
                </Typography>
                <Typography variant="caption">
                  Distancia facturable: {activeRequest.estimatedDistanceKm} km ·
                  Tarifa/km: $
                  {Number(activeRequest.tariffApplied?.ratePerKm || 0.67).toFixed(
                    2
                  )}{" "}
                  · Mínimo: $
                  {Number(activeRequest.tariffApplied?.minFare || 13.56).toFixed(
                    2
                  )}
                </Typography>
              </Alert>
            </Stack>
          </Box>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default B2BSolicitudesPage;
