import { useContext } from "react";
import { ToastContext } from "../context/contexts";

export const useToast = () => useContext(ToastContext);
