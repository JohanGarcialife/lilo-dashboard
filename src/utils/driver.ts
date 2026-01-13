import { getFirestore, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { firebaseApp } from "./firebase";
import { Driver } from "../app/(DashboardLayout)/(Conductores)/_components/Riders";

export async function updateDriver(uid: string, data: Partial<Driver>) {
  const db = getFirestore(firebaseApp);
  const driverRef = doc(db, "drivers", uid);
  await updateDoc(driverRef, data);
}

export async function deleteDriver(uid: string) {
  const db = getFirestore(firebaseApp);
  const driverRef = doc(db, "drivers", uid);
  await deleteDoc(driverRef);
}
