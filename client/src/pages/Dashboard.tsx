import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Eye, Pencil, Trash2, Loader2, Search, Copy, BookTemplate, List, MapPin, ChevronsUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useProjects, useDeleteProject, useDuplicateProject, useSaveAsTemplate, usePublishProject, type Project } from "@/hooks/useProjects";
import { Header } from "@/components/layout/Header";

type TabValue = "published" | "drafts" | "templates" | "lists";

export default function Dashboard() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("published");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [selectedForTemplate, setSelectedForTemplate] = useState<Project | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const { toast } = useToast();

  const { data: projects, isLoading } = useProjects();

  const deleteMutation = useDeleteProject();
  const duplicateMutation = useDuplicateProject();
  const saveAsTemplateMutation = useSaveAsTemplate();
  const publishMutation = usePublishProject();

  // Filter projects based on active tab
  const getTabProjects = (tab: TabValue) => {
    if (!projects) return [];

    switch (tab) {
      case "published":
        return projects.filter(p => p.status === "published" && !p.isTemplate && p.projectType === "itinerary");
      case "drafts":
        return projects.filter(p => p.status === "draft");
      case "templates":
        return projects.filter(p => p.isTemplate);
      case "lists":
        return projects.filter(p => p.projectType === "list" && !p.isTemplate);
      default:
        return projects;
    }
  };

  // Filter projects based on search query and active tab
  const filteredProjects = getTabProjects(activeTab).filter(project => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.assistantName.toLowerCase().includes(query) ||
      project.customUrlSlug.toLowerCase().includes(query) ||
      (project.templateName && project.templateName.toLowerCase().includes(query))
    );
  });

  // Count for each tab
  const publishedCount = projects?.filter(p => p.status === "published" && !p.isTemplate && p.projectType === "itinerary").length || 0;
  const draftsCount = projects?.filter(p => p.status === "draft").length || 0;
  const templatesCount = projects?.filter(p => p.isTemplate).length || 0;
  const listsCount = projects?.filter(p => p.projectType === "list" && !p.isTemplate).length || 0;

  const handleSaveAsTemplate = (project: Project) => {
    setSelectedForTemplate(project);
    setTemplateName(project.name);
    setTemplateDescription("");
    setTemplateDialogOpen(true);
  };

  const handleTemplateSubmit = () => {
    if (!selectedForTemplate || !templateName.trim()) {
      toast({
        title: "Error",
        description: "Template name is required.",
        variant: "destructive",
      });
      return;
    }
    saveAsTemplateMutation.mutate(
      { id: selectedForTemplate.id, name: templateName.trim(), description: templateDescription.trim() },
      {
        onSuccess: () => {
          toast({
            title: "Template saved",
            description: "The project has been saved as a template.",
          });
          setTemplateDialogOpen(false);
          setTemplateName("");
          setTemplateDescription("");
          setSelectedForTemplate(null);
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to save as template. Please try again.",
            variant: "destructive",
          });
        }
      }
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const handlePublish = (project: Project) => {
    publishMutation.mutate(project.id, {
      onSuccess: () => {
        toast({
          title: "Published",
          description: "The project has been published.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to publish. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast({
          title: "Project deleted",
          description: "The project has been successfully removed.",
        });
        setDeleteId(null);
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to delete project. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const handleDuplicate = (id: string) => {
    duplicateMutation.mutate(id, {
      onSuccess: (data) => {
        toast({
          title: "Project duplicated",
          description: "A copy of the project has been created as a draft.",
        });
        // Navigate to the new project
        if (data?.id) {
          window.location.href = `/itinerary/edit/${data.id}`;
        }
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to duplicate project. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-[hsl(var(--cta))]" data-testid="loader-dashboard" />
          <p className="text-lg text-foreground-subtle">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-12">
        {/* Header Section */}
        <div className="mb-8 flex items-center justify-between animate-slide-up">
          <div>
            <h1 className="text-4xl md:text-5xl font-serif mb-2">Your Projects</h1>
            <p className="text-foreground-subtle">Manage your itineraries and lists</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="lg" className="gap-2 shadow-md" data-testid="button-create-project">
                <Plus className="w-5 h-5" />
                Create New
                <ChevronsUpDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/itinerary/create?type=itinerary&new=1" className="flex items-center gap-2 cursor-pointer">
                  <MapPin className="w-4 h-4" />
                  <span>New Itinerary</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/itinerary/create?type=list&new=1" className="flex items-center gap-2 cursor-pointer">
                  <List className="w-4 h-4" />
                  <span>New List</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-6">
          <div className="flex items-center justify-between gap-4 animate-slide-up delay-100">
            <TabsList className="bg-[hsl(var(--sand-200))] p-1">
              <TabsTrigger value="published" data-testid="tab-published" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Published
                {publishedCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-[hsl(var(--cta))] text-[hsl(var(--cta-foreground))] hover:bg-[hsl(var(--cta-hover))]">{publishedCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="drafts" data-testid="tab-drafts" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Drafts
                {draftsCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-[hsl(var(--sand-400))] text-white">{draftsCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="lists" data-testid="tab-lists" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Lists
                {listsCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-[hsl(var(--assistant-light))] text-[hsl(var(--assistant-dark))]">{listsCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="templates" data-testid="tab-templates" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Templates
                {templatesCount > 0 && (
                  <Badge variant="secondary" className="ml-2 bg-[hsl(var(--sand-500))] text-white">{templatesCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {projects && projects.length > 0 && (
              <div className="relative w-full max-w-sm animate-fade-in delay-200">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/80 backdrop-blur-sm"
                  data-testid="input-search"
                />
              </div>
            )}
          </div>

          <TabsContent value={activeTab} className="space-y-4">
            {!filteredProjects || filteredProjects.length === 0 ? (
              <Card className="animate-scale-in">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[hsl(var(--sand-200))] flex items-center justify-center">
                    <Search className="w-8 h-8 text-foreground-subtle" />
                  </div>
                  <p className="text-foreground-subtle mb-6 text-lg">
                    {searchQuery ? "No projects match your search" : `No ${activeTab} found`}
                  </p>
                  <Link href="/itinerary/create?new=1">
                    <Button variant="default" data-testid="button-create-first">
                      Create your first project
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredProjects.map((project, index) => (
                  <Card
                    key={project.id}
                    data-testid={`card-project-${project.id}`}
                    className="group hover-scale animate-slide-up"
                    style={{ animationDelay: `${(index % 10) * 0.05}s` }}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <CardTitle className="text-xl font-serif" data-testid={`text-title-${project.id}`}>
                              {project.templateName || project.name}
                            </CardTitle>
                            {project.status === "draft" && (
                              <Badge variant="outline" className="border-[hsl(var(--sand-300))] text-foreground-muted">Draft</Badge>
                            )}
                            {project.isTemplate && (
                              <Badge className="bg-[hsl(var(--sand-500))] text-white">Template</Badge>
                            )}
                            {project.projectType === "list" && (
                              <Badge variant="secondary" className="gap-1 bg-[hsl(var(--assistant-light))] text-[hsl(var(--assistant-dark))]">
                                <List className="w-3 h-3" />
                                List
                              </Badge>
                            )}
                            {project.projectType === "itinerary" && (
                              <Badge variant="secondary" className="gap-1 bg-[hsl(var(--sand-300))] text-foreground">
                                <MapPin className="w-3 h-3" />
                                Itinerary
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="space-y-2">
                            {project.templateDescription && (
                              <p className="text-sm text-foreground-muted mb-3">{project.templateDescription}</p>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">Assistant:</span>
                              <span className="text-foreground-subtle" data-testid={`text-assistant-${project.id}`}>{project.assistantName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">URL:</span>
                              <span className="text-xs font-mono text-foreground-subtle bg-[hsl(var(--sand-100))] px-2 py-0.5 rounded" data-testid={`text-slug-${project.id}`}>
                                /itinerary/{project.customUrlSlug}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">Created:</span>
                              <span className="text-foreground-subtle" data-testid={`text-created-${project.id}`}>
                                {formatDate(project.created)}
                              </span>
                            </div>
                          </CardDescription>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Link href={`/itinerary/${project.customUrlSlug}`}>
                            <Button variant="outline" size="sm" className="gap-2" data-testid={`button-view-${project.id}`}>
                              <Eye className="w-4 h-4" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                          </Link>

                          <Link href={`/itinerary/edit/${project.id}`}>
                            <Button variant="outline" size="sm" className="gap-2" data-testid={`button-edit-${project.id}`}>
                              <Pencil className="w-4 h-4" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                          </Link>

                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => handleDuplicate(project.id)}
                            disabled={duplicateMutation.isPending}
                            data-testid={`button-duplicate-${project.id}`}
                          >
                            <Copy className="w-4 h-4" />
                            <span className="hidden sm:inline">Duplicate</span>
                          </Button>

                          {project.status === "draft" && !project.isTemplate && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handlePublish(project)}
                              disabled={publishMutation.isPending}
                              data-testid={`button-publish-${project.id}`}
                            >
                              <Eye className="w-4 h-4" />
                              <span className="hidden sm:inline">Publish</span>
                            </Button>
                          )}

                          {project.status === "published" && !project.isTemplate && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleSaveAsTemplate(project)}
                              data-testid={`button-save-template-${project.id}`}
                            >
                              <BookTemplate className="w-4 h-4" />
                              <span className="hidden sm:inline">Save as Template</span>
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-[hsl(var(--error))] hover:text-[hsl(var(--error))] hover:bg-[hsl(var(--error-light))]"
                            onClick={() => setDeleteId(project.id)}
                            data-testid={`button-delete-${project.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all associated data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[hsl(var(--error))] text-white hover:bg-[hsl(var(--error))]/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent data-testid="dialog-save-template">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>
              Create a reusable template from this project. Templates can be duplicated to quickly create new projects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Algarve Villa Package"
                data-testid="input-template-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe what this template is for..."
                rows={3}
                data-testid="textarea-template-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTemplateDialogOpen(false)}
              data-testid="button-cancel-template"
            >
              Cancel
            </Button>
            <Button
              onClick={handleTemplateSubmit}
              disabled={saveAsTemplateMutation.isPending || !templateName.trim()}
              data-testid="button-confirm-template"
            >
              {saveAsTemplateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Template"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
