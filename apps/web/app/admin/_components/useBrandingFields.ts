import { useState } from "react";
import type { BrandingFieldSet } from "./shared";

// react-hooks/set-state-in-effect blocks useEffect(() => { setState() }); use
// the "adjust during render" pattern instead — React re-renders immediately
// without painting, so no visible intermediate state.
export function useBrandingFields(remote: BrandingFieldSet) {
  const [title, setTitle] = useState(remote.title ?? "");
  const [subtitle, setSubtitle] = useState(remote.subtitle ?? "");
  const [headerImageUrl, setHeaderImageUrl] = useState(remote.headerImageUrl ?? "");
  const [questionHeading, setQuestionHeading] = useState(remote.questionHeading ?? "");

  const [prev, setPrev] = useState({
    title: remote.title,
    subtitle: remote.subtitle,
    headerImageUrl: remote.headerImageUrl,
    questionHeading: remote.questionHeading,
  });
  if (
    remote.title !== prev.title ||
    remote.subtitle !== prev.subtitle ||
    remote.headerImageUrl !== prev.headerImageUrl ||
    remote.questionHeading !== prev.questionHeading
  ) {
    setPrev({ title: remote.title, subtitle: remote.subtitle, headerImageUrl: remote.headerImageUrl, questionHeading: remote.questionHeading });
    setTitle(remote.title ?? "");
    setSubtitle(remote.subtitle ?? "");
    setHeaderImageUrl(remote.headerImageUrl ?? "");
    setQuestionHeading(remote.questionHeading ?? "");
  }

  const dirty =
    title !== (remote.title ?? "") ||
    subtitle !== (remote.subtitle ?? "") ||
    headerImageUrl !== (remote.headerImageUrl ?? "") ||
    questionHeading !== (remote.questionHeading ?? "");

  return {
    title, setTitle,
    subtitle, setSubtitle,
    headerImageUrl, setHeaderImageUrl,
    questionHeading, setQuestionHeading,
    dirty,
  };
}
