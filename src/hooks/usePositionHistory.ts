import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type HistoryEntry = {
  id: string;
  position_id: string;
  user_id: string;
  action: string;
  old_data: any;
  new_data: any;
  created_at: string;
};

export const usePositionHistory = (storeId?: string) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    if (!storeId || storeId === "all") return;
    
    try {
      const { data, error } = await supabase
        .from("position_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      console.error("Error fetching history:", error);
    }
  };

  const saveHistory = async (
    positionId: string,
    action: string,
    oldData: any,
    newData: any
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("position_history")
        .insert({
          position_id: positionId,
          user_id: user.id,
          action,
          old_data: oldData,
          new_data: newData,
        });

      if (error) throw error;
      await fetchHistory();
    } catch (error: any) {
      console.error("Error saving history:", error);
    }
  };

  const undo = async () => {
    if (history.length === 0) {
      toast({
        title: "Nema akcija za vraćanje",
        description: "Nema prethodnih akcija",
      });
      return;
    }

    const lastEntry = history[0];
    setLoading(true);

    try {
      // Restore old data
      const { error } = await supabase
        .from("positions")
        .update(lastEntry.old_data)
        .eq("id", lastEntry.position_id);

      if (error) throw error;

      // Move to undo stack
      setUndoStack([lastEntry, ...undoStack]);
      setHistory(history.slice(1));

      toast({
        title: "Akcija vraćena",
        description: "Prethodna promena je poništena",
      });

      return true;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Nije moguće vratiti akciju",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const redo = async () => {
    if (undoStack.length === 0) {
      toast({
        title: "Nema akcija za ponavljanje",
        description: "Nema akcija za ponavljanje",
      });
      return;
    }

    const lastUndo = undoStack[0];
    setLoading(true);

    try {
      // Restore new data
      const { error } = await supabase
        .from("positions")
        .update(lastUndo.new_data)
        .eq("id", lastUndo.position_id);

      if (error) throw error;

      // Move back to history
      setHistory([lastUndo, ...history]);
      setUndoStack(undoStack.slice(1));

      toast({
        title: "Akcija ponovljena",
        description: "Akcija je ponovo primenjena",
      });

      return true;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Greška",
        description: error.message || "Nije moguće ponoviti akciju",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [storeId]);

  return {
    history,
    saveHistory,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: undoStack.length > 0,
    loading,
  };
};
