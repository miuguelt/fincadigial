import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { TreeDeciduous, Users } from 'lucide-react';
import { reproductionService } from '@/entities/reproduction/api/reproduction.service';
import { useToast } from '@/app/providers/ToastContext';
import { cn } from '@/shared/ui/cn.ts';

interface TreeNode {
  id: number;
  record: string;
  sex: string;
  breeds_id?: number;
  idFather?: number;
  idMother?: number;
}

interface TreeData {
  rootId: number;
  root_record: string;
  root_sex: string;
  ancestors?: {
    nodes: Record<number, TreeNode>;
    edges: Array<{ from: number; to: number; relation: string }>;
    depth: number;
  };
  descendants?: {
    nodes: Record<number, TreeNode>;
    edges: Array<{ from: number; to: number; relation: string }>;
    depth: number;
  };
}

interface GenealogyTreeProps {
  animalId: number;
}

export default function GenealogyTree({ animalId }: GenealogyTreeProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TreeData | null>(null);
  const [activeTab, setActiveTab] = useState<'ancestors' | 'descendants'>('ancestors');
  const [depth, setDepth] = useState(3);

  const loadGenealogy = async () => {
    setLoading(true);
    try {
      const response = await reproductionService.getGenealogy(animalId, depth, 'both');
      setData(response as TreeData);
    } catch (error) {
      console.error('Error loading genealogy:', error);
      showToast('Error al cargar genealogía', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGenealogy();
  }, [animalId, depth]);
  const getSexStyles = (sex: string) => {
    return sex === 'Macho' 
      ? 'from-info-500/20 to-info-600/5 border-info-500/30 text-info-700 dark:text-info-300' 
      : 'from-danger-500/20 to-danger-600/5 border-danger-500/30 text-danger-700 dark:text-danger-300';
  };

  const renderNode = (node: TreeNode, isRoot: boolean = false) => (
    <div
      key={node.id}
      className={cn(
        "relative flex flex-col items-center gap-2 p-3 rounded-lg border transition-all duration-500 group/node",
        "bg-gradient-to-br backdrop-blur-xl shadow-lg hover:shadow-2xl hover:scale-105 hover:-translate-y-1",
        isRoot 
          ? "from-primary/30 to-primary/5 border-primary shadow-primary/20 ring-4 ring-primary/5" 
          : getSexStyles(node.sex)
      )}
    >
      <div className="flex items-center gap-2">
        <div className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shadow-inner",
          node.sex === 'Macho' ? "bg-info-500/20 text-info-600 dark:text-info-400" : "bg-danger-500/20 text-danger-600 dark:text-danger-400"
        )}>
          {node.sex === 'Macho' ? '♂' : '♀'}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-tighter opacity-50">{node.sex}</span>
          <span className="font-black text-sm tracking-tight">{node.record}</span>
        </div>
      </div>
      {isRoot && (
        <Badge variant="default" className="text-[9px] h-4 bg-primary text-primary-foreground font-black px-1.5 uppercase tracking-widest">
          Sujeto Central
        </Badge>
      )}
      
      {/* Decorative background element */}
      <div className="absolute -z-10 inset-0 bg-card/40 dark:bg-black/20 rounded-lg opacity-0 group-hover/node:opacity-100 transition-opacity" />
    </div>
  );

  const renderAncestors = () => {
    if (!data?.ancestors) return null;
    const { nodes, edges } = data.ancestors;

    const childrenByParent: Record<number, number[]> = {};
    edges.forEach(edge => {
      if (!childrenByParent[edge.from]) childrenByParent[edge.from] = [];
      childrenByParent[edge.from].push(edge.to);
    });

    const renderHierarchy = (nodeId: number, level: number = 0) => {
      const node = nodes[nodeId];
      if (!node) return null;

      const children = childrenByParent[nodeId] || [];
      const isRoot = nodeId === data.rootId;

      return (
        <div key={nodeId} className="flex flex-col items-center gap-8">
          {renderNode(node, isRoot)}
          
          {children.length > 0 && (
            <div className="relative flex items-start gap-12 pt-8">
              {/* Connecting line to children */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-[2px] bg-gradient-to-b from-primary/50 to-transparent" />
              
              {children.map((childId, idx) => (
                <div key={childId} className="relative">
                  {/* Horizontal connecting line */}
                  {children.length > 1 && (
                    <div className={cn(
                      "absolute top-0 h-[2px] bg-primary/20",
                      idx === 0 ? "left-1/2 right-0" : idx === children.length - 1 ? "left-0 right-1/2" : "left-0 right-0"
                    )} />
                  )}
                  {renderHierarchy(childId, level + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="py-10 overflow-x-auto scrollbar-hide">
        <div className="flex justify-center min-w-max px-20">
          {renderHierarchy(data.rootId)}
        </div>
      </div>
    );
  };

  const renderDescendants = () => {
    if (!data?.descendants) return null;
    const { nodes, edges } = data.descendants;

    const childrenByParent: Record<number, number[]> = {};
    edges.forEach(edge => {
      if (!childrenByParent[edge.from]) childrenByParent[edge.from] = [];
      childrenByParent[edge.from].push(edge.to);
    });

    const renderHierarchy = (nodeId: number, level: number = 0) => {
      const node = nodes[nodeId];
      if (!node) return null;

      const children = childrenByParent[nodeId] || [];
      const isRoot = nodeId === data.rootId;

      return (
        <div key={nodeId} className="flex flex-col items-center gap-8">
          {renderNode(node, isRoot)}
          
          {children.length > 0 && (
            <div className="relative flex items-start gap-12 pt-8">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-[2px] bg-gradient-to-b from-primary/50 to-transparent" />
              
              {children.map((childId, idx) => (
                <div key={childId} className="relative">
                  {children.length > 1 && (
                    <div className={cn(
                      "absolute top-0 h-[2px] bg-primary/20",
                      idx === 0 ? "left-1/2 right-0" : idx === children.length - 1 ? "left-0 right-1/2" : "left-0 right-0"
                    )} />
                  )}
                  {renderHierarchy(childId, level + 1)}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="py-10 overflow-x-auto scrollbar-hide">
        <div className="flex justify-center min-w-max px-20">
          {renderHierarchy(data.rootId)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Genealogía</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Genealogía</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">No hay datos de genealogía</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TreeDeciduous className="h-5 w-5" />
              Genealogía
            </CardTitle>
            <CardDescription className="text-xs">
              {data.root_record} ({data.root_sex})
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDepth(Math.max(1, depth - 1))}
              disabled={depth <= 1}
            >
              -
            </Button>
            <span className="text-sm font-medium">{depth} niveles</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDepth(Math.min(6, depth + 1))}
              disabled={depth >= 6}
            >
              +
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'ancestors' | 'descendants')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ancestors" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Ancestros
            </TabsTrigger>
            <TabsTrigger value="descendants" className="flex items-center gap-2">
              <TreeDeciduous className="h-4 w-4" />
              Descendientes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ancestors" className="mt-4">
            {renderAncestors()}
          </TabsContent>
          <TabsContent value="descendants" className="mt-4">
            {renderDescendants()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
