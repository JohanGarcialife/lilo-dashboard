"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Typography,
  Alert,
  IconButton,
  InputAdornment,
  Stack,
  Tooltip,
} from "@mui/material";
import {
  IconEye,
  IconEyeOff,
  IconRefresh,
  IconCopy,
  IconKey,
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { useFormik } from "formik";
import * as yup from "yup";
import CustomTextField from "@/app/(DashboardLayout)/components/forms/theme-elements/CustomTextField";
import {
  B2BCompany,
  BillingCadenceDocument,
  BillingPeriodId,
  PaymentCondition,
  CompanyStatus,
} from "@/types/b2b";
import {
  DEFAULT_BILLING_CADENCES,
  getBillingCadences,
  generateTemporaryPassword,
} from "@/services/b2b/companyService";

interface CompanyFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<B2BCompany, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  initialData?: B2BCompany | null;
}

const validationSchema = yup.object({
  tradeName: yup.string().required("El nombre comercial es obligatorio"),
  legalName: yup.string().required("La razón social es obligatoria"),
  nit: yup
    .string()
    .matches(
      /^\d{4}-\d{6}-\d{3}-\d{1}$/,
      "Formato de NIT inválido (ej: 0614-010190-101-1)"
    )
    .required("El NIT es obligatorio"),
  nrc: yup
    .string()
    .matches(/^\d{1,8}-\d{1}$/, "Formato de NRC inválido (ej: 123456-7)")
    .required("El NRC es obligatorio"),
  contactName: yup.string().required("El contacto autorizado es obligatorio"),
  phone: yup.string().required("El teléfono es obligatorio"),
  whatsapp: yup.string().required("El WhatsApp es obligatorio"),
  email: yup
    .string()
    .email("Ingresa un correo electrónico válido")
    .required("El correo es obligatorio"),
  address: yup.string().required("La dirección es obligatoria"),
  paymentCondition: yup
    .string()
    .oneOf(["cash", "transfer", "card", "credit15", "credit30"])
    .required("Selecciona la condición de pago"),
  billingPeriod: yup
    .string()
    .oneOf(
      ["daily", "weekly", "semi-monthly", "monthly"],
      "El período catorcenal ('biweekly') está retirado. Selecciona Diario, Semanal, Quincenal (15 y último día) o Mensual."
    )
    .required("Selecciona la cadencia de facturación"),
  negotiatedFareRate: yup
    .number()
    .typeError("Ingresa una tarifa válida")
    .positive("La tarifa negociada debe ser mayor a $0.00")
    .required("La tarifa negociada por km es obligatoria"),
  initialPassword: yup
    .string()
    .test(
      "min-if-present",
      "La contraseña temporal debe tener al menos 6 caracteres",
      (val) => !val || val.trim().length === 0 || val.trim().length >= 6
    ),
  status: yup.string().oneOf(["active", "suspended", "inactive"]),
});

export const CompanyForm: React.FC<CompanyFormProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
}) => {
  const isEditing = Boolean(initialData);
  const [cadences, setCadences] = useState<BillingCadenceDocument[]>(
    DEFAULT_BILLING_CADENCES
  );
  const [showPassword, setShowPassword] = useState(true);
  const [defaultTempPassword, setDefaultTempPassword] = useState(() =>
    generateTemporaryPassword()
  );

  useEffect(() => {
    if (open) {
      getBillingCadences().then((list) => setCadences(list));
      if (!initialData) {
        setDefaultTempPassword(generateTemporaryPassword());
      }
    }
  }, [open, initialData]);

  const normalizePaymentCondition = (raw?: string): PaymentCondition => {
    if (raw === "credit_15" || raw === "credit15") return "credit15";
    if (raw === "credit_30" || raw === "credit30") return "credit30";
    if (raw === "cash" || raw === "transfer" || raw === "card") return raw;
    return "credit30";
  };

  const formik = useFormik({
    initialValues: {
      tradeName: initialData?.tradeName || "",
      legalName: initialData?.legalName || "",
      nit: initialData?.nit || "",
      nrc: initialData?.nrc || "",
      contactName: initialData?.contactName || "",
      phone: initialData?.phone || "",
      whatsapp: initialData?.whatsapp || "",
      email: initialData?.email || "",
      address: initialData?.address || "",
      paymentCondition: normalizePaymentCondition(initialData?.paymentCondition),
      billingPeriod: (
        initialData?.billingPeriod === "biweekly"
          ? "semi-monthly"
          : initialData?.billingPeriod || "monthly"
      ) as BillingPeriodId,
      negotiatedFareRate: initialData?.negotiatedFareRate ?? 0.67,
      creditLimit: initialData?.creditLimit ?? null,
      initialPassword: initialData ? "" : defaultTempPassword,
      requiresInvoice: initialData?.requiresInvoice ?? true,
      requiresCCF: initialData?.requiresCCF ?? false,
      balance: initialData?.balance || 0,
      status: initialData?.status || ("active" as CompanyStatus),
      countryId: "sv" as const,
    },
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        await onSubmit(values);
        formik.resetForm();
        onClose();
      } catch (err) {
        console.error("Error submitting company:", err);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const retiredBiweekly = cadences.find((c) => c.id === "biweekly");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" fontWeight={600}>
          {isEditing ? "Editar Empresa B2B" : "Nueva Empresa B2B (El Salvador)"}
        </Typography>
      </DialogTitle>
      <form onSubmit={formik.handleSubmit}>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Información General */}
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" color="primary" fontWeight={600}>
                Identificación Corporativa
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption">Nombre Comercial *</Typography>
              <CustomTextField
                fullWidth
                name="tradeName"
                placeholder="Ej. Distribuidora Central"
                value={formik.values.tradeName}
                onChange={formik.handleChange}
                error={formik.touched.tradeName && Boolean(formik.errors.tradeName)}
                helperText={formik.touched.tradeName && formik.errors.tradeName}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption">Razón Social *</Typography>
              <CustomTextField
                fullWidth
                name="legalName"
                placeholder="Ej. Distribuidora Central S.A. de C.V."
                value={formik.values.legalName}
                onChange={formik.handleChange}
                error={formik.touched.legalName && Boolean(formik.errors.legalName)}
                helperText={formik.touched.legalName && formik.errors.legalName}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption">NIT (El Salvador) *</Typography>
              <CustomTextField
                fullWidth
                name="nit"
                placeholder="0614-010190-101-1"
                value={formik.values.nit}
                onChange={formik.handleChange}
                error={formik.touched.nit && Boolean(formik.errors.nit)}
                helperText={formik.touched.nit && formik.errors.nit}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption">NRC (Registro Contribuyente) *</Typography>
              <CustomTextField
                fullWidth
                name="nrc"
                placeholder="123456-7"
                value={formik.values.nrc}
                onChange={formik.handleChange}
                error={formik.touched.nrc && Boolean(formik.errors.nrc)}
                helperText={formik.touched.nrc && formik.errors.nrc}
              />
            </Grid>

            {/* Contacto */}
            <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
              <Typography variant="subtitle2" color="primary" fontWeight={600}>
                Contacto Autorizado
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption">Nombre del Contacto *</Typography>
              <CustomTextField
                fullWidth
                name="contactName"
                placeholder="Ej. Juan Pérez"
                value={formik.values.contactName}
                onChange={formik.handleChange}
                error={formik.touched.contactName && Boolean(formik.errors.contactName)}
                helperText={formik.touched.contactName && formik.errors.contactName}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption">Correo Electrónico *</Typography>
              <CustomTextField
                fullWidth
                name="email"
                placeholder="corporativo@empresa.com"
                value={formik.values.email}
                onChange={formik.handleChange}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption">Teléfono *</Typography>
              <CustomTextField
                fullWidth
                name="phone"
                placeholder="+503 2222-0000"
                value={formik.values.phone}
                onChange={formik.handleChange}
                error={formik.touched.phone && Boolean(formik.errors.phone)}
                helperText={formik.touched.phone && formik.errors.phone}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption">WhatsApp Operativo *</Typography>
              <CustomTextField
                fullWidth
                name="whatsapp"
                placeholder="+503 7777-0000"
                value={formik.values.whatsapp}
                onChange={formik.handleChange}
                error={formik.touched.whatsapp && Boolean(formik.errors.whatsapp)}
                helperText={formik.touched.whatsapp && formik.errors.whatsapp}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="caption">Dirección Fiscal / Operativa *</Typography>
              <CustomTextField
                fullWidth
                multiline
                rows={2}
                name="address"
                placeholder="Colonia Escalón, Calle El Mirador, San Salvador"
                value={formik.values.address}
                onChange={formik.handleChange}
                error={formik.touched.address && Boolean(formik.errors.address)}
                helperText={formik.touched.address && formik.errors.address}
              />
            </Grid>

            {/* Condiciones Comerciales */}
            <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
              <Typography variant="subtitle2" color="primary" fontWeight={600}>
                Condiciones Comerciales y Fiscales
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption">Condición de Pago *</Typography>
              <CustomTextField
                select
                fullWidth
                name="paymentCondition"
                value={formik.values.paymentCondition}
                onChange={formik.handleChange}
              >
                <MenuItem value="cash">Efectivo contra entrega</MenuItem>
                <MenuItem value="transfer">Transferencia Bancaria</MenuItem>
                <MenuItem value="card">Tarjeta de Crédito / Débito</MenuItem>
                <MenuItem value="credit15">Crédito 15 Días</MenuItem>
                <MenuItem value="credit30">Crédito 30 Días</MenuItem>
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption">
                Cadencia de Corte / Facturación (`billingPeriod`) *
              </Typography>
              <CustomTextField
                select
                fullWidth
                name="billingPeriod"
                value={formik.values.billingPeriod}
                onChange={formik.handleChange}
                error={
                  formik.touched.billingPeriod &&
                  Boolean(formik.errors.billingPeriod)
                }
                helperText={
                  formik.touched.billingPeriod && formik.errors.billingPeriod
                }
              >
                {cadences.map((cadence) => (
                  <MenuItem
                    key={cadence.id}
                    value={cadence.id}
                    disabled={!cadence.active || !cadence.selectable}
                  >
                    {cadence.label}
                  </MenuItem>
                ))}
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Typography variant="caption">Estado de la Cuenta *</Typography>
              <CustomTextField
                select
                fullWidth
                name="status"
                value={formik.values.status}
                onChange={formik.handleChange}
              >
                <MenuItem value="active">Activa</MenuItem>
                <MenuItem value="suspended">Suspendida</MenuItem>
                <MenuItem value="inactive">Inactiva</MenuItem>
              </CustomTextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption">
                Tarifa Negociada por Km ($ USD / km) *
              </Typography>
              <CustomTextField
                fullWidth
                type="number"
                inputProps={{ step: "0.01", min: "0.01" }}
                name="negotiatedFareRate"
                placeholder="0.67"
                value={formik.values.negotiatedFareRate}
                onChange={formik.handleChange}
                error={
                  formik.touched.negotiatedFareRate &&
                  Boolean(formik.errors.negotiatedFareRate)
                }
                helperText={
                  (formik.touched.negotiatedFareRate &&
                    formik.errors.negotiatedFareRate) ||
                  "Tarifa contractual B2B para El Salvador (ej. $0.67 USD/km)"
                }
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Typography variant="caption">
                Techo de Consumo Inicial ($ USD) — Vacío = SIN LÍMITE
              </Typography>
              <CustomTextField
                fullWidth
                type="number"
                inputProps={{ step: "10", min: "0" }}
                name="creditLimit"
                placeholder="Vacío = SIN LÍMITE (ej. 1200)"
                value={
                  formik.values.creditLimit === null ||
                  formik.values.creditLimit === undefined
                    ? ""
                    : formik.values.creditLimit
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const val = e.target.value;
                  formik.setFieldValue(
                    "creditLimit",
                    val.trim() === "" ? null : Number(val)
                  );
                }}
                helperText="Define el techo inicial del Centro de Costo corporativo (CF-23)"
              />
            </Grid>
            {retiredBiweekly?.constraint && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                  <Typography variant="caption">
                    <strong>Nota fiscal (`billingCadences`):</strong>{" "}
                    {retiredBiweekly.constraint}
                  </Typography>
                </Alert>
              </Grid>
            )}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formik.values.requiresInvoice}
                    onChange={(e) =>
                      formik.setFieldValue("requiresInvoice", e.target.checked)
                    }
                  />
                }
                label="Requiere Factura Consumidor Final"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formik.values.requiresCCF}
                    onChange={(e) =>
                      formik.setFieldValue("requiresCCF", e.target.checked)
                    }
                  />
                }
                label="Requiere Comprobante de Crédito Fiscal (CCF)"
              />
            </Grid>

            {/* Credenciales de Acceso — Portal B2B */}
            <Grid size={{ xs: 12 }} sx={{ mt: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <IconKey size={18} color="#5D87FF" />
                <Typography variant="subtitle2" color="primary" fontWeight={600}>
                  Credenciales de Acceso — Portal Corporativo B2B
                </Typography>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, sm: 8 }}>
              <Typography variant="caption">
                {isEditing
                  ? "Nueva Contraseña Temporal (Opcional — solo si deseas restablecer el acceso)"
                  : "Contraseña Temporal Inicial (Primer Login) *"}
              </Typography>
              <CustomTextField
                fullWidth
                type={showPassword ? "text" : "password"}
                name="initialPassword"
                placeholder={
                  isEditing
                    ? "Dejar vacío para mantener contraseña actual"
                    : "Ej. LiloSV-4829!"
                }
                value={formik.values.initialPassword}
                onChange={formik.handleChange}
                error={
                  formik.touched.initialPassword &&
                  Boolean(formik.errors.initialPassword)
                }
                helperText={
                  formik.touched.initialPassword && formik.errors.initialPassword
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip
                        title={
                          showPassword
                            ? "Ocultar contraseña"
                            : "Mostrar contraseña"
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword((prev) => !prev)}
                        >
                          {showPassword ? (
                            <IconEyeOff size={18} />
                          ) : (
                            <IconEye size={18} />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Copiar contraseña temporal">
                        <IconButton
                          size="small"
                          onClick={() => {
                            if (formik.values.initialPassword) {
                              navigator.clipboard.writeText(
                                formik.values.initialPassword
                              );
                              toast.success("Contraseña temporal copiada");
                            }
                          }}
                        >
                          <IconCopy size={18} />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid
              size={{ xs: 12, sm: 4 }}
              sx={{ display: "flex", alignItems: "flex-end" }}
            >
              <Button
                fullWidth
                variant="outlined"
                color="primary"
                startIcon={<IconRefresh size={16} />}
                onClick={() => {
                  const newPass = generateTemporaryPassword();
                  formik.setFieldValue("initialPassword", newPass);
                  setShowPassword(true);
                  toast.success("Nueva contraseña temporal generada");
                }}
                sx={{ height: 42 }}
              >
                Generar Clave
              </Button>
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Alert severity="warning" sx={{ py: 0.5 }}>
                <Typography variant="caption">
                  <strong>Flujo de Seguridad B2B:</strong> La empresa ingresará al
                  Portal Corporativo con el correo{" "}
                  <strong>{formik.values.email || "corporativo@empresa.com"}</strong>{" "}
                  y esta contraseña temporal. En su primer inicio de sesión, el
                  portal le exigirá obligatoriamente configurar su contraseña
                  definitiva.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={formik.isSubmitting}
          >
            {isEditing ? "Guardar Cambios" : "Crear Empresa"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CompanyForm;

