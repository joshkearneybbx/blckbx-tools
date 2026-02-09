import { Link } from "wouter";
import { UtensilsCrossed, ArrowLeft } from "lucide-react";

export default function MealsComingSoon() {
  return (
    <div className="min-h-screen bg-[#E8E4DE] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#1a1a1a] text-white flex items-center justify-center">
          <UtensilsCrossed className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-semibold text-[#1a1a1a] mb-3">
          Meal Planner
        </h1>
        <p className="text-gray-600 mb-6">
          AI-powered meal planning with recipes from trusted sources and smart
          shopping lists. Coming soon.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[#1a1a1a] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tools
        </Link>
      </div>
    </div>
  );
}
