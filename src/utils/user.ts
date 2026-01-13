import { getFirestore, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { firebaseApp } from "@/utils/firebase"; // Ajusta la ruta según tu inicialización de Firebase

export async function getUserRole(uid: string): Promise<string | null> {
  const db = getFirestore(firebaseApp);
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    return data.role || null;
  }
  return null;
}

export async function updateUser(uid: string, data: any) {
  const db = getFirestore(firebaseApp);
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, data);
}

export async function deleteUser(uid: string) {
  const db = getFirestore(firebaseApp);
  const userRef = doc(db, "users", uid);
  await deleteDoc(userRef);
}

export async function getUser(uid: string) {
    const db = getFirestore(firebaseApp);
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return userSnap.data();
    }
    return null;
}