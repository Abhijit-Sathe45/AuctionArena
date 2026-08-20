import React from "react";
import OrganizerLayout from "../../components/OrganizerLayout";
import HowToUseGuide from "../../components/HowToUseGuide";

export default function OrganizerHowToUse() {
  return (
    <OrganizerLayout>
      <div className="max-w-6xl mx-auto py-2 sm:py-4">
        <HowToUseGuide isOrganizer={true} />
      </div>
    </OrganizerLayout>
  );
}
