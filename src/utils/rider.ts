import { getDatabase, ref, update, remove } from "firebase/database";
import { firebaseApp } from "./firebase";
import { Rider } from "../app/(DashboardLayout)/(Conductores)/_components/ListRiders";

export async function updateRider(driverId: string, data: Partial<Rider>) {
  const db = getDatabase(firebaseApp);
  const riderRef = ref(db, `conductores_activos/${driverId}`);
  await update(riderRef, data);
}

export async function deleteRider(driverId: string) {
  const db = getDatabase(firebaseApp);
  const riderRef = ref(db, `conductores_activos/${driverId}`);
  await remove(riderRef);
}
