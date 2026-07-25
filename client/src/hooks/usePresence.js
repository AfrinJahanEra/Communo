import { useContext } from "react";
import { PresenceContext } from "../context/contexts";

export const usePresence = () => useContext(PresenceContext);
