import { Image, Page, Text, View } from "@react-pdf/renderer";
import type { MealPlanStats } from "@/lib/meals/api";
import { pdfStyles } from "./PDFStyles";
import { PDFRecipeItem, RecipeCard } from "./PDFRecipePage";
import logoUrl from "@assets/BlckBx PNG on Blck_1763042542782.png";

interface MenuOverviewItem {
  dayLabel: string;
  titles: string[];
}

interface PDFCoverPageProps {
  dateLabel: string;
  pageNumber: number;
  numDays: number;
  mealsPerDay: number;
  averageKcalPerDay: number;
  focusTags: string[];
  stats: MealPlanStats;
  menuOverview: MenuOverviewItem[];
  firstRecipe: PDFRecipeItem | null;
  images?: Record<string, string>;
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

function formatTag(tag: string): string {
  return tag
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PDFCoverPage({
  dateLabel,
  pageNumber,
  numDays,
  mealsPerDay,
  averageKcalPerDay,
  focusTags,
  stats,
  menuOverview,
  firstRecipe,
  images,
}: PDFCoverPageProps) {
  const subtitleTags = focusTags.slice(0, 2).map(formatTag);

  return (
    <Page size="A4" style={pdfStyles.page}>
      <Header dateLabel={dateLabel} />

      <View style={pdfStyles.content}>
        <View style={pdfStyles.titleSection}>
          <Text style={pdfStyles.docTitle}>Your Meal Plan</Text>
          <View style={pdfStyles.badgeRow}>
            <Text style={[pdfStyles.badge, pdfStyles.badgeHighlight]}>{numDays} Days</Text>
            <Text style={pdfStyles.badge}>{mealsPerDay} Meals / day</Text>
            <Text style={pdfStyles.badge}>~{averageKcalPerDay} kcal/day</Text>
            {subtitleTags.map((tag) => (
              <Text key={tag} style={pdfStyles.badge}>{tag}</Text>
            ))}
          </View>
        </View>

        <View style={pdfStyles.statsBar}>
          <View style={pdfStyles.statItem}>
            <Text style={pdfStyles.statValue}>{stats.recipesCount}</Text>
            <Text style={pdfStyles.statLabel}>Recipes</Text>
          </View>
          <View style={pdfStyles.statItem}>
            <Text style={pdfStyles.statValue}>{stats.ingredientsCount}</Text>
            <Text style={pdfStyles.statLabel}>Ingredients</Text>
          </View>
          <View style={pdfStyles.statItem}>
            <Text style={pdfStyles.statValue}>{Math.max(1, Math.round(stats.totalCookTimeMinutes / 60))}hrs</Text>
            <Text style={pdfStyles.statLabel}>Total Cook Time</Text>
          </View>
          <View style={pdfStyles.statItem}>
            <Text style={pdfStyles.statValue}>{stats.estimatedCost}</Text>
            <Text style={pdfStyles.statLabel}>Est. Cost</Text>
          </View>
        </View>

        <Text style={pdfStyles.sectionHeading}>This Week&apos;s Menu</Text>
        <View style={pdfStyles.menuGrid}>
          {menuOverview.map((item, index) => (
            <View key={`${item.dayLabel}-${index}`} style={pdfStyles.menuCard}>
              <View style={pdfStyles.menuCardInner}>
                <Text style={pdfStyles.menuDay}>{item.dayLabel}</Text>
                {(item.titles?.length ? item.titles : ["Meal plan entry"]).map((title, titleIndex) => (
                  <Text key={`${item.dayLabel}-${titleIndex}`} style={pdfStyles.menuTitle}>
                    {title}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>

        <Text style={pdfStyles.sectionHeading}>Recipes</Text>
        {firstRecipe ? <RecipeCard recipe={firstRecipe} images={images} /> : null}
      </View>

      <Footer pageNumber={pageNumber} />
    </Page>
  );
}
