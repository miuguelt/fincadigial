import { NavigationGroup } from '../model/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Globe, Lock, Unlock } from 'lucide-react';

interface NavigationGroupCardProps {
  group: NavigationGroup;
  onClick?: (group: NavigationGroup) => void;
}

export function NavigationGroupCard({ group, onClick }: NavigationGroupCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(group)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span>{group.icon}</span>
            <span>{group.name}</span>
          </CardTitle>
          <Badge variant="secondary">{group.count} endpoints</Badge>
        </div>
        {group.description && (
          <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-xs">
          {group.endpoints.slice(0, 5).map((endpoint, idx) => (
            <div key={idx} className="flex items-center justify-between py-1 border-b last:border-0">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`
                    ${endpoint.method === 'GET' ? 'bg-green-100 text-green-800' : ''}
                    ${endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' : ''}
                    ${endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' : ''}
                    ${endpoint.method === 'PATCH' ? 'bg-purple-100 text-purple-800' : ''}
                    ${endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' : ''}
                  `}
                >
                  {endpoint.method}
                </Badge>
                <span className="text-muted-foreground truncate max-w-[200px]">
                  {endpoint.description || endpoint.path}
                </span>
              </div>
              {endpoint.requires_auth ? (
                <Lock className="h-3 w-3 text-orange-500" />
              ) : (
                <Unlock className="h-3 w-3 text-green-500" />
              )}
            </div>
          ))}
          {group.endpoints.length > 5 && (
            <div className="text-muted-foreground text-center pt-1">
              +{group.endpoints.length - 5} más...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
