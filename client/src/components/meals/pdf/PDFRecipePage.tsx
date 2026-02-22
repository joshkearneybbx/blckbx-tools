import { Image, Link, Page, Text, View } from "@react-pdf/renderer";
import type { MealPlanItem } from "@/lib/meals/api";
import { ActivityIcon, ClockIcon, LinkIcon, UsersIcon } from "@/components/pdf/PDFIcons";
import { pdfStyles } from "./PDFStyles";
import logoUrl from "@assets/BlckBx PNG on Blck_1763042542782.png";
import { sanitizePdfText } from "./textSanitizer";

export interface PDFRecipeItem extends MealPlanItem {
  pdfDayNumber: number;
}

interface HeaderFooterProps {
  dateLabel: string;
  pageNumber: number;
}

function Header({ dateLabel }: { dateLabel: string }) {
  return (
    <View style={pdfStyles.header} fixed>
      <Image src={logoUrl} style={pdfStyles.headerLogo} />
      <Text style={pdfStyles.headerDate}>{dateLabel}</Text>
    </View>
  );
}

function Footer({ pageNumber }: { pageNumber: number }) {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerText}>blckbx.co.uk</Text>
      <Text style={pdfStyles.footerPage}>{pageNumber}</Text>
    </View>
  );
}

function sourceLabel(source?: string): string {
  if (!source) return "Source";
  return sanitizePdfText(source
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" "));
}

export function RecipeCard({
  recipe,
  images,
}: {
  recipe: PDFRecipeItem;
  images?: Record<string, string>;
}) {
  const title = sanitizePdfText(recipe.title ?? recipe.recipe?.title ?? "Untitled recipe");
  const ingredients = (recipe.ingredients ?? recipe.recipe?.ingredients ?? []).map(sanitizePdfText);
  const instructions = (recipe.instructions ?? recipe.recipe?.instructions ?? []).map(sanitizePdfText);
  const cookTime = recipe.cook_time ?? recipe.recipe?.cook_time;
  const calories = recipe.calories ?? recipe.recipe?.calories;
  const protein = recipe.protein ?? recipe.recipe?.protein;
  const servings = recipe.servings ?? recipe.recipe?.servings;
  const source = recipe.source ?? recipe.recipe?.source;
  const sourceUrl = recipe.source_url ?? recipe.recipe?.source_url;
  const recipeImageId = recipe.recipe?.id ?? recipe.recipe_id ?? recipe.id;
  const imageData = recipeImageId ? images?.[recipeImageId] : undefined;

  return (
    <View style={pdfStyles.recipeCard} wrap={false}>
      <View style={pdfStyles.recipeHeader}>
        <Text style={pdfStyles.dayBadge}>Day {recipe.pdfDayNumber}</Text>
        {sourceUrl ? (
          <Link src={sourceUrl} style={pdfStyles.recipeTitle}>{title}</Link>
        ) : (
          <Text style={pdfStyles.recipeTitle}>{title}</Text>
        )}
      </View>

      <View style={pdfStyles.recipeBody}>
        <View style={pdfStyles.metaRow}>
          {imageData ? (
            <View style={pdfStyles.metaThumbnailWrap}>
              <Image src={imageData} style={pdfStyles.recipeThumbnail} />
            </View>
          ) : null}
          <View style={pdfStyles.metaItemsWrap}>
            <View style={pdfStyles.metaItem}>
              <ClockIcon size={9} color="#6B6B68" />
              <Text style={pdfStyles.metaText}><Text style={pdfStyles.metaStrong}>{cookTime ?? 0} mins</Text></Text>
            </View>
            {typeof calories === "number" && calories > 0 ? (
              <View style={pdfStyles.metaItem}>
                <ActivityIcon size={9} color="#6B6B68" />
                <Text style={pdfStyles.metaText}><Text style={pdfStyles.metaStrong}>{calories} kcal</Text></Text>
              </View>
            ) : null}
            {typeof protein === "number" && protein > 0 ? (
              <View style={pdfStyles.metaItem}>
                <Text style={pdfStyles.metaText}><Text style={pdfStyles.metaStrong}>{protein}g protein</Text></Text>
              </View>
            ) : null}
            <View style={pdfStyles.metaItem}>
              <UsersIcon size={9} color="#6B6B68" />
              <Text style={pdfStyles.metaText}><Text style={pdfStyles.metaStrong}>{servings ?? 1} servings</Text></Text>
            </View>
            <View style={pdfStyles.metaItem}>
              <LinkIcon size={9} color="#6B6B68" />
              <Text style={pdfStyles.metaText}>{sourceLabel(source)}</Text>
            </View>
          </View>
        </View>

        <View style={pdfStyles.recipeColumns}>
          <View style={pdfStyles.ingredientsCol}>
            <Text style={pdfStyles.colHeading}>Ingredients</Text>
            {ingredients.slice(0, 18).map((ingredient, index) => (
              <View key={`${ingredient}-${index}`} style={pdfStyles.ingredientRow}>
                <View style={pdfStyles.ingredientBullet} />
                <Text style={pdfStyles.ingredientText}>{sanitizePdfText(ingredient)}</Text>
              </View>
            ))}
          </View>

          <View style={pdfStyles.methodCol}>
            <Text style={pdfStyles.colHeading}>Method</Text>
            {instructions.slice(0, 12).map((instruction, index) => (
              <View key={`${instruction}-${index}`} style={pdfStyles.stepRow}>
                <Text style={pdfStyles.stepNumber}>{index + 1}</Text>
                <Text style={pdfStyles.stepText}>{sanitizePdfText(instruction)}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export function PDFRecipePage({
  dateLabel,
  pageNumber,
  recipes,
  images,
}: HeaderFooterProps & { recipes: PDFRecipeItem[]; images?: Record<string, string> }) {
  return (
    <Page size="A4" style={pdfStyles.page}>
      <Header dateLabel={dateLabel} />

      <View style={pdfStyles.content}>
        <Text style={pdfStyles.sectionHeading}>Recipes</Text>
        {recipes.map((recipe) => (
          <RecipeCard key={`${recipe.id}-${recipe.pdfDayNumber}`} recipe={recipe} images={images} />
        ))}
      </View>

      <Footer pageNumber={pageNumber} />
    </Page>
  );
}
