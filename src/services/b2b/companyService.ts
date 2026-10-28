import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { db, auth, functions, firebaseApp } from "@/utils/firebase";
import {
  B2BCompany,
  B2BTraveller,
  BillingCadenceDocument,
  CostCenter,
  LimitRequest,
} from "@/types/b2b";

const getCompanyCol = (countryCode = "sv") =>
  collection(db, "countries", countryCode.toLowerCase(), "b2bCompanies");

const getCompanyDoc = (companyId: string, countryCode = "sv") =>
  doc(db, "countries", countryCode.toLowerCase(), "b2bCompanies", companyId);

const BILLING_CADENCES_COLLECTION = "billingCadences";

/**
 * Catálogo oficial de cadencias de facturación B2B (`billingCadences/{periodId}` - CF-24).
 */
export const DEFAULT_BILLING_CADENCES: BillingCadenceDocument[] = [
  {
    id: "daily",
    label: "Diario",
    description:
      "Cierre de facturación al finalizar cada día calendario (00:00 hora local del país de la empresa).",
    windowKind: "calendar_day",
    windowDays: 1,
    active: true,
    selectable: true,
    displayOrder: 1,
    constraint: null,
  },
  {
    id: "weekly",
    label: "Semanal",
    description: "Cierre cada 7 días corridos desde el inicio de la ventana activa.",
    windowKind: "rolling_days",
    windowDays: 7,
    active: true,
    selectable: true,
    displayOrder: 2,
    constraint: null,
  },
  {
    id: "semi-monthly",
    label: "Quincenal (15 y último día)",
    description:
      "Dos cierres por mes calendario: día 15 y último día del mes (28, 29, 30 o 31 según corresponda).",
    windowKind: "semi_monthly_15_eom",
    windowDays: null,
    active: true,
    selectable: true,
    displayOrder: 3,
    constraint: null,
  },
  {
    id: "monthly",
    label: "Mensual",
    description:
      "Cierre el último día de cada mes calendario (día 1 al último día del mes).",
    windowKind: "calendar_month",
    windowDays: null,
    active: true,
    selectable: true,
    displayOrder: 4,
    constraint: null,
  },
  {
    id: "biweekly",
    label: "Catorcenal (no disponible)",
    description:
      "Ciclos de 14 días corridos. Retirado del alta de empresas porque genera 3 cierres en meses con 31 días.",
    windowKind: "rolling_days",
    windowDays: 14,
    active: false,
    selectable: false,
    displayOrder: 99,
    constraint:
      "Deshabilitado: los ciclos de 14 días producen meses con 3 cierres, incompatible con la conciliación fiscal mensual de El Salvador. Usa Quincenal (15 y último día) o Semanal.",
  },
];

export const FALLBACK_SV_COMPANIES: B2BCompany[] = [
  {
    id: "XmXrFylloVeOIQhrGXG1",
    tradeName: "Industrias El Ángel S.A. de C.V.",
    legalName: "Industrias El Ángel Sociedad Anónima de Capital Variable",
    nit: "0614-120589-101-4",
    nrc: "184920-5",
    contactName: "Lic. Roberto Carlos Mendoza",
    phone: "+503 2250-8900",
    whatsapp: "+503 7890-1122",
    email: "logistica@elangel.com.sv",
    address: "Km 14 Carretera Troncal del Norte, Apopa, San Salvador",
    paymentCondition: "credit30",
    billingPeriod: "monthly",
    requiresInvoice: true,
    requiresCCF: true,
    balance: 75.95,
    status: "active",
    countryId: "sv",
  },
];

export let FALLBACK_SV_COST_CENTERS: CostCenter[] = [
  {
    id: "CCSJeYZJfT3FMy2kEass",
    code: "CC-APOPA-01",
    name: "Techo Corporativo General · Planta Apopa",
    department: "Operaciones y Logística Corporativa",
    budgetLimit: 2500,
    monthlyBudget: 2500,
    spent: 420.5,
    reserved: 19.7,
    budgetWindowStart: Date.now() - 5 * 86400000,
    status: "active",
  },
  {
    id: "xJmKzymXoW9MBxnSE4bD",
    code: "CC-COM-02",
    name: "Dirección Comercial y Logística (Sin límite)",
    department: "Ventas Corporativas",
    budgetLimit: null,
    monthlyBudget: null,
    spent: 315.75,
    reserved: 0,
    budgetWindowStart: null,
    status: "active",
  },
];

export let FALLBACK_SV_LIMIT_REQUESTS: LimitRequest[] = [
  {
    id: "limReqSv001",
    costCenterId: "CCSJeYZJfT3FMy2kEass",
    costCenterName: "Techo Corporativo General · Planta Apopa",
    previousLimit: 2000,
    requestedLimit: 2500,
    reason: "Incremento operativo por visitas de auditoría regional en Planta Apopa.",
    requestedByUid: "companyAdminElAngel",
    requestedByName: "Lic. Roberto Carlos Mendoza",
    status: "applied",
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export let FALLBACK_SV_TRAVELLERS: B2BTraveller[] = [
  {
    id: "travSv001",
    companyId: "compSv001",
    name: "Ing. Carlos Rivas",
    email: "crivas@elangel.com.sv",
    phone: "+503 7890-1122",
    department: "Operaciones Planta Apopa",
    employeeCode: "EA-1042",
    status: "active",
  },
  {
    id: "travSv002",
    companyId: "compSv001",
    name: "Lic. Sofía Méndez",
    email: "smendez@elangel.com.sv",
    phone: "+503 7700-3344",
    department: "Dirección Comercial",
    employeeCode: "EA-2019",
    status: "active",
  },
  {
    id: "travSv003",
    companyId: "compSv001",
    name: "Ing. Javier Ernesto Кury",
    email: "jkury@elangel.com.sv",
    phone: "+503 7611-9080",
    department: "Auditoría Externa / Invitado",
    employeeCode: "INV-088",
    status: "active",
  },
];

export const getBillingCadences = async (): Promise<BillingCadenceDocument[]> => {
  try {
    await auth.authStateReady();
    const snapshot = await getDocs(collection(db, BILLING_CADENCES_COLLECTION));
    if (snapshot.empty) {
      return DEFAULT_BILLING_CADENCES;
    }
    const list = snapshot.docs.map((docSnap) => ({
      id: docSnap.id as BillingCadenceDocument["id"],
      ...(docSnap.data() as Omit<BillingCadenceDocument, "id">),
    }));
    return list.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  } catch {
    return DEFAULT_BILLING_CADENCES;
  }
};

const sortCompaniesDesc = (companies: B2BCompany[]): B2BCompany[] => {
  return companies.sort((a, b) => {
    const timeA =
      (a.createdAt as any)?.toMillis?.() ||
      ((a.createdAt as any)?.seconds ? (a.createdAt as any).seconds * 1000 : 0);
    const timeB =
      (b.createdAt as any)?.toMillis?.() ||
      ((b.createdAt as any)?.seconds ? (b.createdAt as any).seconds * 1000 : 0);
    return timeB - timeA;
  });
};

export const getB2BCompanies = async (countryCode = "sv"): Promise<B2BCompany[]> => {
  try {
    await auth.authStateReady();
    const snapshot = await getDocs(getCompanyCol(countryCode));
    const companies = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    })) as B2BCompany[];

    return companies.length > 0
      ? sortCompaniesDesc(companies)
      : FALLBACK_SV_COMPANIES;
  } catch (error) {
    console.warn("[companyService] Using fallback companies:", error);
    return FALLBACK_SV_COMPANIES;
  }
};

export const subscribeToB2BCompanies = (
  callback: (companies: B2BCompany[]) => void,
  onError?: (error: any) => void,
  countryCode = "sv"
) => {
  let unsubscribeFirestore: (() => void) | null = null;
  let cancelled = false;

  auth.authStateReady().then(() => {
    if (cancelled) return;

    unsubscribeFirestore = onSnapshot(
      getCompanyCol(countryCode),
      (snapshot) => {
        const companies = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as B2BCompany[];

        callback(
          companies.length > 0
            ? sortCompaniesDesc(companies)
            : FALLBACK_SV_COMPANIES
        );
      },
      (error) => {
        console.warn(
          "[companyService] Firestore read fallback activated:",
          error?.code
        );
        callback(FALLBACK_SV_COMPANIES);
      }
    );
  });

  return () => {
    cancelled = true;
    if (unsubscribeFirestore) unsubscribeFirestore();
  };
};

export const getB2BCompanyById = async (
  id: string,
  countryCode = "sv"
): Promise<B2BCompany | null> => {
  try {
    await auth.authStateReady();
    const docRef = getCompanyDoc(id, countryCode);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      return FALLBACK_SV_COMPANIES.find((c) => c.id === id) || FALLBACK_SV_COMPANIES[0];
    }
    return { id: snapshot.id, ...snapshot.data() } as B2BCompany;
  } catch (error) {
    return FALLBACK_SV_COMPANIES.find((c) => c.id === id) || FALLBACK_SV_COMPANIES[0];
  }
};

export const generateTemporaryPassword = (): string => {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `LiloSV-${randomDigits}!`;
};

const getSecondaryAuth = () => {
  const appName = "liloB2BProvisioner";
  const existing = getApps().find((a) => a.name === appName);
  const secondaryApp =
    existing || initializeApp(firebaseApp.options, appName);
  return getAuth(secondaryApp);
};

export interface ProvisionB2BAuthParams {
  email: string;
  password: string;
  contactName: string;
  phone: string;
  companyId: string;
  tradeName?: string;
}

export const provisionB2BCompanyAuthUser = async ({
  email,
  password,
  contactName,
  phone,
  companyId,
  tradeName,
}: ProvisionB2BAuthParams): Promise<{
  uid?: string;
  email: string;
  temporaryPassword: string;
}> => {
  const normalizedEmail = email.trim().toLowerCase();
  const [firstName, ...rest] = contactName.trim().split(" ");
  const lastName = rest.join(" ") || "";
  let uid: string | undefined;
  let finalPassword = password;

  try {
    // 1. Resolver el ID del documento en roles cuyo name sea "company_admin"
    let roleId = "company_admin";
    try {
      const rolesSnap = await getDocs(collection(db, "roles"));
      const foundDoc = rolesSnap.docs.find(
        (d) => d.data()?.name === "company_admin" || d.id === "company_admin"
      );
      if (foundDoc) {
        roleId = foundDoc.id;
      }
    } catch (err) {
      console.warn("[companyService] Error fetching roles collection:", err);
    }

    // CF-39 / MIGRACION §6-ter: Invocación de createCompanyUser callable oficial
    const createCompanyUserFn = httpsCallable<
      {
        email: string;
        roleId: string;
        companyId: string;
        countryId: string;
        firstName?: string;
        lastName?: string;
      },
      {
        uid: string;
        provisionalPassword: string;
        countryId: string;
        companyId: string;
        roleId: string;
      }
    >(functions, "createCompanyUser");

    const res = await createCompanyUserFn({
      email: normalizedEmail,
      roleId,
      companyId,
      countryId: "sv",
      firstName: firstName || "Admin",
      lastName,
    });

    uid = res.data.uid;
    finalPassword = res.data.provisionalPassword;
  } catch (authErr: any) {
    console.warn("[companyService] createCompanyUser note, falling back to secondaryAuth:", authErr?.message || authErr);
    // Fallback: Aprovisionamiento con secondaryAuth
    const secondaryAuth = getSecondaryAuth();
    try {
      const userCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        normalizedEmail,
        password
      );
      uid = userCred.user.uid;
      finalPassword = password;
    } catch (secErr: any) {
      if (secErr?.code === "auth/email-already-in-use") {
        const usersSnap = await getDocs(
          query(collection(db, "users"), where("email", "==", normalizedEmail))
        );
        if (!usersSnap.empty) {
          uid = usersSnap.docs[0].id;
        }
      } else {
        throw secErr;
      }
    } finally {
      try {
        await signOut(secondaryAuth);
      } catch {
        // Ignorar error al cerrar secondaryAuth
      }
    }
  }

  if (uid) {
    await setDoc(
      doc(db, "users", uid),
      {
        uid,
        email: normalizedEmail,
        firstName: firstName || "Admin",
        lastName,
        displayName: contactName.trim(),
        phone: phone.trim(),
        userType: "client",
        countryId: "sv",
        companyId,
        companyRole: "company_admin",
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: true,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    try {
      await setDoc(
        doc(db, "users", uid, "countryMemberships", "sv"),
        {
          countryId: "sv",
          status: "active",
          role: "company_admin",
          companyId,
          joinedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (memErr) {
      console.warn("[companyService] Membership record note:", memErr);
    }
  }

  try {
    await addDoc(collection(db, "mail"), {
      to: normalizedEmail,
      message: {
        subject: `Credenciales de Acceso — Portal Corporativo Lilo B2B (${
          tradeName || "El Salvador"
        })`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #E5EAEF; border-radius: 8px;">
            <h2 style="color: #2A3547; margin-top: 0;">Bienvenido al Portal Corporativo Lilo B2B</h2>
            <p style="color: #5A6A85;">Hola <strong>${contactName}</strong>,</p>
            <p style="color: #5A6A85;">Tu cuenta corporativa para <strong>${
              tradeName || normalizedEmail
            }</strong> en El Salvador ha sido habilitada.</p>
            <div style="background: #ECF2FF; padding: 16px; border-radius: 6px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>Correo de acceso:</strong> ${normalizedEmail}</p>
              <p style="margin: 4px 0;"><strong>Contraseña temporal:</strong> <code style="font-size: 15px; font-weight: bold;">${finalPassword}</code></p>
            </div>
            <p style="color: #5A6A85; font-size: 13px;">Por seguridad, al iniciar sesión por primera vez el sistema te solicitará configurar tu contraseña corporativa definitiva.</p>
          </div>
        `,
      },
    });
  } catch (mailErr) {
    console.warn("[companyService] Could not queue welcome email:", mailErr);
  }

  return { uid, email: normalizedEmail, temporaryPassword: finalPassword };
};

export const createB2BCompany = async (
  data: Omit<B2BCompany, "id" | "createdAt" | "updatedAt">
): Promise<{ id: string; provisionalPassword: string }> => {
  if (data.billingPeriod === "biweekly") {
    throw new Error(
      "El período catorcenal ('biweekly') está retirado. Usa Quincenal (15 y último día) o Semanal."
    );
  }

  const { initialPassword, ...companyData } = data;
  let tempPassword =
    initialPassword && initialPassword.trim().length >= 6
      ? initialPassword.trim()
      : generateTemporaryPassword();

  const negotiatedFareRate =
    typeof companyData.negotiatedFareRate === "number" &&
    Number.isFinite(companyData.negotiatedFareRate) &&
    companyData.negotiatedFareRate > 0
      ? Number(companyData.negotiatedFareRate)
      : 0.67;

  const countryCode = (companyData.countryId || "sv").toLowerCase();
  const docRef = await addDoc(getCompanyCol(countryCode), {
    ...companyData,
    email: companyData.email.trim().toLowerCase(),
    billingPeriod: companyData.billingPeriod || "monthly",
    negotiatedFareRate,
    validFrom: Timestamp.now(),
    countryId: countryCode,
    balance: companyData.balance || 0,
    status: companyData.status || "active",
    mustChangePassword: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Inicializar el único Centro de Costo de la empresa (P13: resolveTheCostCentre exige exactamente 1)
  const initialBudgetLimit = normalizeBudgetLimitValue(companyData.creditLimit);
  try {
    await addDoc(
      collection(db, "countries", countryCode, "b2bCompanies", docRef.id, "costCenters"),
      {
        code: "CC-CORP-01",
        name: "Operaciones Corporativas",
        department: "General",
        budgetLimit: initialBudgetLimit,
        monthlyBudget: initialBudgetLimit,
        spent: 0,
        reserved: 0,
        budgetWindowStart: Date.now(),
        status: "active",
        createdAt: serverTimestamp(),
      }
    );
  } catch (ccErr) {
    console.warn("[companyService] Could not create initial costCenter:", ccErr);
  }

  // Inicializar viajero corporativo hospedado base para que la empresa pueda reservar de inmediato
  try {
    await addDoc(
      collection(db, "countries", countryCode, "b2bCompanies", docRef.id, "travellers"),
      {
        companyId: docRef.id,
        name: companyData.contactName.trim(),
        fullName: companyData.contactName.trim(),
        email: companyData.email.trim().toLowerCase(),
        phone: companyData.phone.trim(),
        department: "Administración Corporativa",
        active: true,
        status: "active",
        createdAt: serverTimestamp(),
      }
    );
  } catch (trErr) {
    console.warn("[companyService] Could not create initial traveller:", trErr);
  }

  // Provisionar usuario en Firebase Auth + documento users/{uid} + countryMemberships/sv
  try {
    const provisioned = await provisionB2BCompanyAuthUser({
      email: companyData.email,
      password: tempPassword,
      contactName: companyData.contactName,
      phone: companyData.phone,
      companyId: docRef.id,
      tradeName: companyData.tradeName,
    });
    if (provisioned.temporaryPassword) {
      tempPassword = provisioned.temporaryPassword;
    }
    if (provisioned.uid) {
      await updateDoc(docRef, {
        authUid: provisioned.uid,
        mustChangePassword: true,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (provErr: any) {
    console.error("[companyService] Auth provisioning error:", provErr);
    throw new Error(`Empresa registrada en base de datos, pero falló la creación del usuario en Auth: ${provErr?.message || provErr}`);
  }

  return { id: docRef.id, provisionalPassword: tempPassword };
};

export const updateB2BCompany = async (
  id: string,
  data: Partial<Omit<B2BCompany, "id" | "createdAt" | "updatedAt">>
): Promise<void> => {
  if (data.billingPeriod === "biweekly") {
    throw new Error(
      "El período catorcenal ('biweekly') está retirado. Usa Quincenal (15 y último día) o Semanal."
    );
  }
  const { initialPassword, ...companyData } = data;
  const updates: Record<string, any> = {
    ...companyData,
    updatedAt: serverTimestamp(),
  };
  if (typeof companyData.negotiatedFareRate === "number" && companyData.negotiatedFareRate > 0) {
    updates.negotiatedFareRate = Number(companyData.negotiatedFareRate);
    if (!companyData.validFrom) {
      updates.validFrom = Timestamp.now();
    }
  }
  if (initialPassword && initialPassword.trim().length >= 6 && companyData.email) {
    const provisioned = await provisionB2BCompanyAuthUser({
      email: companyData.email,
      password: initialPassword.trim(),
      contactName: companyData.contactName || "Administrador Corporativo",
      phone: companyData.phone || "+503 0000-0000",
      companyId: id,
      tradeName: companyData.tradeName,
    });
    updates.mustChangePassword = true;
    if (provisioned.uid) {
      updates.authUid = provisioned.uid;
    }
  }
  const countryCode = (companyData.countryId || "sv").toLowerCase();
  const docRef = getCompanyDoc(id, countryCode);
  await updateDoc(docRef, updates);
};

export const updateB2BCompanyStatus = async (
  id: string,
  status: B2BCompany["status"],
  countryCode = "sv"
): Promise<void> => {
  return updateB2BCompany(id, { status, countryId: countryCode });
};

/**
 * Normaliza `budgetLimit` según CF-23:
 * `null` o `undefined` = SIN LÍMITE (jamás coercer a 0).
 * Número >= 0 = techo efectivo en USD (`0` bloquea el despacho).
 */
const normalizeBudgetLimitValue = (
  raw: number | null | undefined
): number | null => {
  if (raw === null || raw === undefined) {
    return null;
  }
  const num = Number(raw);
  return Number.isFinite(num) && num >= 0 ? num : null;
};

export const getCostCenters = async (
  companyId: string,
  countryCode = "sv"
): Promise<CostCenter[]> => {
  try {
    await auth.authStateReady();
    const subCol = collection(
      db,
      "countries",
      countryCode.toLowerCase(),
      "b2bCompanies",
      companyId,
      "costCenters"
    );
    const snapshot = await getDocs(subCol);
    const list = snapshot.docs.map((d) => {
      const raw = d.data();
      return {
        id: d.id,
        ...raw,
        budgetLimit: normalizeBudgetLimitValue(raw.budgetLimit),
        spent: typeof raw.spent === "number" ? raw.spent : 0,
        reserved: typeof raw.reserved === "number" ? raw.reserved : 0,
      };
    }) as CostCenter[];
    return list.length > 0 ? list : FALLBACK_SV_COST_CENTERS;
  } catch (error) {
    return FALLBACK_SV_COST_CENTERS;
  }
};

export const createCostCenter = async (
  companyId: string,
  data: Omit<CostCenter, "id" | "createdAt">,
  countryCode = "sv"
): Promise<string> => {
  const normalizedLimit = normalizeBudgetLimitValue(data.budgetLimit);
  const payload = {
    ...data,
    budgetLimit: normalizedLimit,
    monthlyBudget: normalizedLimit,
    spent: 0,
    reserved: 0,
    budgetWindowStart: Date.now(),
    status: "active" as const,
    createdAt: serverTimestamp(),
  };

  try {
    const subCol = collection(
      db,
      "countries",
      countryCode.toLowerCase(),
      "b2bCompanies",
      companyId,
      "costCenters"
    );
    const docRef = await addDoc(subCol, payload);
    return docRef.id;
  } catch {
    const newId = `ccSv${Date.now()}`;
    FALLBACK_SV_COST_CENTERS = [
      ...FALLBACK_SV_COST_CENTERS,
      { id: newId, ...payload },
    ];
    return newId;
  }
};

export const updateCostCenter = async (
  companyId: string,
  centerId: string,
  data: Partial<Omit<CostCenter, "id" | "createdAt">>,
  countryCode = "sv"
): Promise<void> => {
  const updates: Record<string, any> = { ...data };
  if ("budgetLimit" in data) {
    updates.budgetLimit = normalizeBudgetLimitValue(data.budgetLimit);
    updates.monthlyBudget = updates.budgetLimit;
  }

  FALLBACK_SV_COST_CENTERS = FALLBACK_SV_COST_CENTERS.map((c) =>
    c.id === centerId ? ({ ...c, ...updates } as CostCenter) : c
  );

  try {
    const docRef = doc(
      db,
      "countries",
      countryCode.toLowerCase(),
      "b2bCompanies",
      companyId,
      "costCenters",
      centerId
    );
    await updateDoc(docRef, updates);
  } catch {
    // Updated in memory fallback
  }
};

export const deleteCostCenter = async (
  companyId: string,
  centerId: string,
  countryCode = "sv"
): Promise<void> => {
  FALLBACK_SV_COST_CENTERS = FALLBACK_SV_COST_CENTERS.filter(
    (c) => c.id !== centerId
  );
  try {
    const docRef = doc(
      db,
      "countries",
      countryCode.toLowerCase(),
      "b2bCompanies",
      companyId,
      "costCenters",
      centerId
    );
    await deleteDoc(docRef);
  } catch {
    // Deleted in memory fallback
  }
};

export const getLimitRequests = async (
  companyId: string,
  countryCode = "sv"
): Promise<LimitRequest[]> => {
  try {
    await auth.authStateReady();
    const subCol = collection(
      db,
      "countries",
      countryCode.toLowerCase(),
      "b2bCompanies",
      companyId,
      "limitRequests"
    );
    const snapshot = await getDocs(subCol);
    const list = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as LimitRequest[];
    return list.length > 0 ? list : FALLBACK_SV_LIMIT_REQUESTS;
  } catch {
    return FALLBACK_SV_LIMIT_REQUESTS;
  }
};

export const recordLimitRequestAudit = async (
  companyId: string,
  entry: Omit<LimitRequest, "id" | "createdAt">,
  countryCode = "sv"
): Promise<string> => {
  const fallbackEntry: LimitRequest = {
    ...entry,
    id: `limReq${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  FALLBACK_SV_LIMIT_REQUESTS = [fallbackEntry, ...FALLBACK_SV_LIMIT_REQUESTS];

  try {
    const subCol = collection(
      db,
      "countries",
      countryCode.toLowerCase(),
      "b2bCompanies",
      companyId,
      "limitRequests"
    );
    const docRef = await addDoc(subCol, {
      ...entry,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch {
    return fallbackEntry.id;
  }
};

export const getCompanyTravellers = async (
  companyId: string,
  countryCode = "sv"
): Promise<B2BTraveller[]> => {
  try {
    await auth.authStateReady();
    const subCol = collection(
      db,
      "countries",
      countryCode.toLowerCase(),
      "b2bCompanies",
      companyId,
      "travellers"
    );
    const snapshot = await getDocs(subCol);
    const list = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as B2BTraveller[];
    return list.length > 0 ? list : FALLBACK_SV_TRAVELLERS;
  } catch {
    return FALLBACK_SV_TRAVELLERS;
  }
};

export const createCompanyTraveller = async (
  companyId: string,
  traveller: Omit<B2BTraveller, "id" | "createdAt">,
  countryCode = "sv"
): Promise<B2BTraveller> => {
  const fallbackTraveller: B2BTraveller = {
    ...traveller,
    id: `travSv${Date.now()}`,
    status: traveller.status || "active",
  };
  FALLBACK_SV_TRAVELLERS = [...FALLBACK_SV_TRAVELLERS, fallbackTraveller];

  try {
    const subCol = collection(
      db,
      "countries",
      countryCode.toLowerCase(),
      "b2bCompanies",
      companyId,
      "travellers"
    );
    const docRef = await addDoc(subCol, {
      ...traveller,
      status: traveller.status || "active",
      createdAt: serverTimestamp(),
    });
    return { ...fallbackTraveller, id: docRef.id };
  } catch {
    return fallbackTraveller;
  }
};

