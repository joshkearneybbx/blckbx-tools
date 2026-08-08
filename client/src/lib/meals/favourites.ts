export function buildFavouriteUniqueKey(clientId: string, recipeId: string): string {
  return `${clientId}_${recipeId}`;
}
