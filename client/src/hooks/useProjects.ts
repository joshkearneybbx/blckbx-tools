import { pb, type Project, type FullProjectData } from '@/lib/pocketbase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Fetch all projects visible to the authenticated user (team-wide access via PB rules)
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!pb.authStore.isValid || !pb.authStore.model?.id) {
        return [];
      }
      return await pb.collection('blckbx_projects').getFullList({
        sort: '-created'
      });
    },
    enabled: pb.authStore.isValid
  });
}

// Fetch full project with all related data
export function useFullProject(idOrSlug: string) {
  return useQuery({
    queryKey: ['project', idOrSlug],
    queryFn: async () => {
      // Try by ID first, then by slug
      let project;
      try {
        project = await pb.collection('blckbx_projects').getOne(idOrSlug);
      } catch {
        const results = await pb.collection('blckbx_projects').getList(1, 1, {
          filter: `customUrlSlug = "${idOrSlug}"`
        });
        if (results.items.length === 0) throw new Error('Project not found');
        project = results.items[0];
      }

      // Use the backend API to get all related data
      const response = await fetch(`${pb.baseUrl}/api/projects/${project.id}/full`, {
        headers: {
          'Authorization': `Bearer ${pb.authStore.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch project data');
      }

      const data = await response.json();
      return data as FullProjectData;
    }
  });
}

// Fetch public project by slug (no auth required)
export function usePublicProject(slug: string) {
  return useQuery({
    queryKey: ['public-project', slug],
    queryFn: async () => {
      const response = await fetch(`${pb.baseUrl}/api/public/itinerary/${slug}`);

      if (!response.ok) {
        throw new Error('Itinerary not found');
      }

      const data = await response.json();
      return data as FullProjectData;
    }
  });
}

// Create project mutation
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Project>) => {
      return await pb.collection('blckbx_projects').create({
        ...data,
        user: pb.authStore.model?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });
}

// Update project mutation
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Project> }) => {
      return await pb.collection('blckbx_projects').update(id, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    }
  });
}

// Delete project mutation
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await pb.collection('blckbx_projects').delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });
}

// Duplicate project mutation
export function useDuplicateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${pb.baseUrl}/api/projects/${id}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pb.authStore.token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to duplicate project');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });
}

// Publish project mutation
export function usePublishProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return await pb.collection('blckbx_projects').update(id, { status: 'published' });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', variables.id] });
    }
  });
}

// Save as template mutation
export function useSaveAsTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description: string }) => {
      return await pb.collection('blckbx_projects').update(id, {
        isTemplate: true,
        templateName: name,
        templateDescription: description
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    }
  });
}
