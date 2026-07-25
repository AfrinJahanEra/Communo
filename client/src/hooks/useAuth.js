import { useContext } from "react";
import { AuthContext } from "../context/contexts";

export const useAuth = () => useContext(AuthContext);
