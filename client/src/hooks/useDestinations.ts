import { pb, type Destination } from '@/lib/pocketbase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch all destinations for a project
export function useDestinations(projectId: string | undefined) {
  return useQuery({
    queryKey: ['destinations', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      return await pb.collection('blckbx_destinations').getFullList({
        filter: `project = "${projectId}"`,
        sort: 'displayOrder'
      });
    },
    enabled: !!projectId
  });
}

// Create destination mutation
export function useCreateDestination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: Omit<Destination, 'id' | 'project' | 'displayOrder'> }) => {
      // Get current max displayOrder
      const existing = await pb.collection('blckbx_destinations').getFullList({
        filter: `project = "${projectId}"`,
        sort: '-displayOrder',
        limit: 1
      });

      const nextDisplayOrder = existing.length > 0 ? (existing[0].displayOrder || 0) + 1 : 0;

      return await pb.collection('blckbx_destinations').create({
        ...data,
        project: projectId,
        displayOrder: nextDisplayOrder
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['destinations', variables.projectId] });
    }
  });
}

// Update destination mutation
export function useUpdateDestination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Destination> }) => {
      return await pb.collection('blckbx_destinations').update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    }
  });
}

// Delete destination mutation
export function useDeleteDestination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await pb.collection('blckbx_destinations').delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destinations'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    }
  });
}

// Reorder destinations mutation
export function useReorderDestinations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, destinationIds }: { projectId: string; destinationIds: string[] }) => {
      // Update displayOrder for each destination
      const updates = destinationIds.map((id, index) =>
        pb.collection('blckbx_destinations').update(id, { displayOrder: index })
      );

      await Promise.all(updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['destinations', variables.projectId] });
    }
  });
}
