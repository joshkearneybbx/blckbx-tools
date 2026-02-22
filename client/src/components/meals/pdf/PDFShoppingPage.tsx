import { Image, Page, Text, View } from "@react-pdf/renderer";
import type { ShoppingList } from "@/lib/meals/api";
import { pdfStyles } from "./PDFStyles";
import logoUrl from "@assets/BlckBx PNG on Blck_1763042542782.png";
import { sanitizePdfText } from "./textSanitizer";

interface PDFShoppingPageProps {
  dateLabel: string;
  numDays: number;
  shoppingList: ShoppingList;
}

function Header({ dateLabel }: { dateLabel: string }) {
  return (
    <View style={pdfStyles.header} fixed>
      <Image src={logoUrl} style={pdfStyles.headerLogo} />
      <Text style={pdfStyles.headerDate}>{dateLabel}</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text style={pdfStyles.footerText}>blckbx.co.uk</Text>
      <Text style={pdfStyles.footerPage} render={({ pageNumber }) => String(pageNumber)} />
    </View>
  );
}

export function PDFShoppingPage({ dateLabel, numDays, shoppingList }: PDFShoppingPageProps) {
  const categories = Object.entries(shoppingList);

  return (
    <Page size="A4" style={pdfStyles.page}>
      <Header dateLabel={dateLabel} />

      <View style={pdfStyles.content}>
        <Text style={pdfStyles.sectionHeading}>Shopping List</Text>
        <Text style={pdfStyles.subtitle}>Everything you need for your {numDays}-day meal plan</Text>

        <View style={pdfStyles.shoppingGrid}>
          {categories.map(([category, items]) => (
            <View key={category} style={pdfStyles.shoppingCategory} wrap={false}>
              <View style={pdfStyles.shoppingCategoryInner}>
                <View style={pdfStyles.shoppingHeader}>
                  <Text style={pdfStyles.shoppingTitle}>{category}</Text>
                </View>
                {items.map((item, itemIndex) => (
                  <View key={`${category}-${itemIndex}`} style={pdfStyles.shoppingItemRow}>
                    <View style={pdfStyles.checkbox} />
                    <Text style={pdfStyles.shoppingText}>{sanitizePdfText(item)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={pdfStyles.tipsBox} wrap={false}>
          <Text style={pdfStyles.tipsTitle}>Shopping Tips</Text>
          <Text style={pdfStyles.tipText}>- Check pantry staples before shopping to avoid duplicate purchases.</Text>
          <Text style={pdfStyles.tipText}>- Buy fresh produce last to keep it crisp and fresh.</Text>
          <Text style={pdfStyles.tipText}>- Batch-cook proteins to save prep time across multiple meals.</Text>
        </View>
      </View>

      <Footer />
    </Page>
  );
}
