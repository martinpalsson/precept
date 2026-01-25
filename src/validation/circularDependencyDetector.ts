/**
 * DV-001: Circular Dependency Detection
 * 
 * Detects circular dependencies using Tarjan's Strongly Connected Components algorithm
 * Categorizes cycles by severity based on cycle length
 */

import { RequirementObject } from '../types';
import {
  CircularDependency,
  ValidationSeverity,
  DeepValidationConfig,
  buildGraph
} from './deepValidation';

/**
 * Detect all circular dependencies using Tarjan's algorithm
 */
export function detectCircularDependencies(
  requirements: RequirementObject[],
  config: DeepValidationConfig
): CircularDependency[] {
  const graph = buildGraph(requirements);
  const sccs = findStronglyConnectedComponents(graph);
  
  const cycles: CircularDependency[] = [];
  
  // Filter out single-node SCCs (not cycles)
  for (const scc of sccs) {
    if (scc.length > 1) {
      // Find the actual cycle path within this SCC
      const cycle = findCyclePath(scc, graph);
      const linkTypes = getCycleLinkTypes(cycle, graph);
      const severity = determineCycleSeverity(cycle.length, config);
      
      cycles.push({
        cycle,
        length: cycle.length - 1, // Don't count the repeated node at end
        severity,
        linkTypes
      });
    } else if (scc.length === 1) {
      // Check for self-loop
      const node = scc[0];
      const edges = graph.get(node);
      if (edges) {
        for (const targets of edges.values()) {
          if (targets.includes(node)) {
            // Self-loop detected
            cycles.push({
              cycle: [node, node],
              length: 1,
              severity: ValidationSeverity.HIGH,
              linkTypes: Array.from(edges.keys())
            });
            break;
          }
        }
      }
    }
  }
  
  return cycles;
}

/**
 * Find strongly connected components using Tarjan's algorithm
 */
function findStronglyConnectedComponents(
  graph: Map<string, Map<string, string[]>>
): string[][] {
  const sccs: string[][] = [];
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let index = 0;
  
  function strongConnect(node: string): void {
    indices.set(node, index);
    lowLinks.set(node, index);
    index++;
    stack.push(node);
    onStack.add(node);
    
    const edges = graph.get(node);
    if (edges) {
      // Get all neighbors regardless of link type
      const neighbors = new Set<string>();
      for (const targets of edges.values()) {
        targets.forEach(t => neighbors.add(t));
      }
      
      for (const neighbor of neighbors) {
        if (!indices.has(neighbor)) {
          strongConnect(neighbor);
          lowLinks.set(node, Math.min(lowLinks.get(node)!, lowLinks.get(neighbor)!));
        } else if (onStack.has(neighbor)) {
          lowLinks.set(node, Math.min(lowLinks.get(node)!, indices.get(neighbor)!));
        }
      }
    }
    
    if (lowLinks.get(node) === indices.get(node)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== node);
      sccs.push(scc);
    }
  }
  
  for (const node of graph.keys()) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }
  
  return sccs;
}

/**
 * Find an actual cycle path within an SCC using DFS
 */
function findCyclePath(
  scc: string[],
  graph: Map<string, Map<string, string[]>>
): string[] {
  const sccSet = new Set(scc);
  const visited = new Set<string>();
  const path: string[] = [];
  
  function dfs(node: string, target: string): boolean {
    visited.add(node);
    path.push(node);
    
    const edges = graph.get(node);
    if (edges) {
      const neighbors = new Set<string>();
      for (const targets of edges.values()) {
        targets.forEach(t => neighbors.add(t));
      }
      
      for (const neighbor of neighbors) {
        if (!sccSet.has(neighbor)) continue;
        
        if (neighbor === target && path.length > 1) {
          path.push(neighbor);
          return true;
        }
        
        if (!visited.has(neighbor)) {
          if (dfs(neighbor, target)) {
            return true;
          }
        }
      }
    }
    
    path.pop();
    return false;
  }
  
  // Start from first node in SCC and try to find path back to it
  const startNode = scc[0];
  dfs(startNode, startNode);
  
  return path.length > 0 ? path : scc;
}

/**
 * Get link types involved in a cycle
 */
function getCycleLinkTypes(
  cycle: string[],
  graph: Map<string, Map<string, string[]>>
): string[] {
  const linkTypes = new Set<string>();
  
  for (let i = 0; i < cycle.length - 1; i++) {
    const from = cycle[i];
    const to = cycle[i + 1];
    const edges = graph.get(from);
    
    if (edges) {
      for (const [linkType, targets] of edges.entries()) {
        if (targets.includes(to)) {
          linkTypes.add(linkType);
        }
      }
    }
  }
  
  return Array.from(linkTypes);
}

/**
 * Determine severity based on cycle length and configuration
 */
function determineCycleSeverity(
  length: number,
  config: DeepValidationConfig
): ValidationSeverity {
  if (length <= 2) {
    return config.cycleSeverity.length2;
  } else if (length <= 5) {
    return config.cycleSeverity.length3_5;
  } else {
    return config.cycleSeverity.length6plus;
  }
}

/**
 * Find minimal cycle (shortest cycle containing a given edge)
 * Useful for suggesting which link to remove
 */
export function findMinimalCycle(
  fromId: string,
  toId: string,
  graph: Map<string, Map<string, string[]>>
): string[] | null {
  // BFS from toId trying to reach fromId
  const queue: Array<{ node: string; path: string[] }> = [{ node: toId, path: [toId] }];
  const visited = new Set<string>([toId]);
  
  while (queue.length > 0) {
    const { node, path } = queue.shift()!;
    
    const edges = graph.get(node);
    if (edges) {
      const neighbors = new Set<string>();
      for (const targets of edges.values()) {
        targets.forEach(t => neighbors.add(t));
      }
      
      for (const neighbor of neighbors) {
        if (neighbor === fromId) {
          return [fromId, ...path];
        }
        
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }
  }
  
  return null;
}
