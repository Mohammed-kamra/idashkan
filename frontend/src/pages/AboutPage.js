import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import StorefrontIcon from "@mui/icons-material/Storefront";
import BusinessIcon from "@mui/icons-material/Business";
import WorkOutlineIcon from "@mui/icons-material/WorkOutline";
import CardGiftcardIcon from "@mui/icons-material/CardGiftcard";
import VideoLibraryIcon from "@mui/icons-material/VideoLibrary";
import ShoppingBagIcon from "@mui/icons-material/ShoppingBag";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import PriceCheckIcon from "@mui/icons-material/PriceCheck";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

const MotionBox = motion(Box);
const MotionCard = motion(Card);

const EASE = [0.22, 1, 0.36, 1];

const AboutPage = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const isDark = theme.palette.mode === "dark";

  const sectionFade = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 22 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.65, ease: EASE },
      };

  const featureCards = [
    { key: "discounts", icon: <LocalOfferIcon /> },
    { key: "stores", icon: <StorefrontIcon /> },
    { key: "brands", icon: <BusinessIcon /> },
    { key: "jobs", icon: <WorkOutlineIcon /> },
    { key: "gifts", icon: <CardGiftcardIcon /> },
    { key: "reels", icon: <VideoLibraryIcon /> },
    { key: "ordering", icon: <ShoppingBagIcon /> },
  ];

  const businessReasons = [
    "about.business.reason1",
    "about.business.reason2",
    "about.business.reason3",
    "about.business.reason4",
  ];

  const userReasons = [
    "about.users.reason1",
    "about.users.reason2",
    "about.users.reason3",
    "about.users.reason4",
  ];

  const pricingPlans = [
    {
      key: "starter",
      icon: <PeopleAltIcon fontSize="small" />,
      highlight: false,
    },
    {
      key: "growth",
      icon: <RocketLaunchIcon fontSize="small" />,
      highlight: true,
    },
    {
      key: "pro",
      icon: <AutoAwesomeIcon fontSize="small" />,
      highlight: false,
    },
  ];

  const blogPosts = [
    "about.blog.post1",
    "about.blog.post2",
    "about.blog.post3",
  ];
  const faqs = [
    "about.faq.q1",
    "about.faq.q2",
    "about.faq.q3",
    "about.faq.q4",
    "about.faq.q5",
    "about.faq.q6",
  ];

  return (
    <Box sx={{ bgcolor: "background.default", pb: { xs: 10, md: 6 } }}>
      <MotionBox
        {...sectionFade}
        sx={{
          background: isDark
            ? "linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(30,58,138,0.56) 38%, rgba(194,65,12,0.34) 100%)"
            : "linear-gradient(135deg, rgba(30,111,217,0.14) 0%, rgba(74,144,226,0.1) 36%, rgba(255,122,26,0.12) 100%)",
          borderBottom: "1px solid",
          borderColor: isDark ? "rgba(148,163,184,0.26)" : "divider",
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 7, md: 11 } }}>
          <Stack spacing={2.2} sx={{ maxWidth: 760 }}>
            <Chip
              label={t("about.heroBadge")}
              icon={<AutoAwesomeIcon />}
              sx={{
                alignSelf: "flex-start",
                fontWeight: 600,
                bgcolor: isDark ? "rgba(37,99,235,0.2)" : undefined,
                color: isDark ? "rgba(224,231,255,0.96)" : undefined,
              }}
              color="primary"
            />
            <Typography
              variant="h2"
              sx={{ fontSize: "1.8rem", fontWeight: 500, lineHeight: 1.3 }}
            >
              {t("about.heroTitle")}
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {t("about.heroSubtitle")}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} pt={1}>
              <Button variant="contained" size="large">
                {t("about.heroPrimaryCta")}
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<PriceCheckIcon />}
              >
                {t("about.heroSecondaryCta")}
              </Button>
            </Stack>
          </Stack>
        </Container>
      </MotionBox>

      <Container maxWidth="lg" sx={{ pt: { xs: 4, md: 6 } }}>
        <MotionBox {...sectionFade} sx={{ mb: { xs: 5, md: 7 } }}>
          <Card
            sx={{
              bgcolor: isDark ? "rgba(17,24,39,0.9)" : "background.paper",
              border: "1px solid",
              borderColor: isDark ? "rgba(148,163,184,0.22)" : "divider",
            }}
          >
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.25 }}>
                {t("about.whatIs.title")}
              </Typography>
              <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {t("about.whatIs.body")}
              </Typography>
            </CardContent>
          </Card>
        </MotionBox>

        <MotionBox {...sectionFade} sx={{ mb: { xs: 6, md: 8 } }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
            {t("about.features.title")}
          </Typography>
          <Grid container spacing={2}>
            {featureCards.map((feature) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={feature.key}>
                <MotionCard
                  whileHover={
                    prefersReducedMotion
                      ? undefined
                      : {
                          y: -4,
                          boxShadow: "0 16px 28px rgba(30,111,217,0.16)",
                        }
                  }
                  transition={{ duration: 0.24, ease: EASE }}
                  sx={{
                    height: "100%",
                    bgcolor: isDark ? "rgba(17,24,39,0.9)" : "background.paper",
                    border: "1px solid",
                    borderColor: isDark ? "rgba(148,163,184,0.2)" : "divider",
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mb: 0.8 }}
                    >
                      <Box
                        color="primary.main"
                        sx={{ display: "flex", alignItems: "center" }}
                      >
                        {feature.icon}
                      </Box>
                      <Typography sx={{ fontWeight: 800 }}>
                        {t(`about.features.${feature.key}.title`)}
                      </Typography>
                    </Stack>
                    <Typography color="text.secondary" variant="body2">
                      {t(`about.features.${feature.key}.desc`)}
                    </Typography>
                  </CardContent>
                </MotionCard>
              </Grid>
            ))}
          </Grid>
        </MotionBox>

        <Grid container spacing={2} sx={{ mb: { xs: 6, md: 8 } }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <MotionCard
              {...sectionFade}
              sx={{
                height: "100%",
                bgcolor: isDark ? "rgba(17,24,39,0.9)" : "background.paper",
                border: "1px solid",
                borderColor: isDark ? "rgba(148,163,184,0.2)" : "divider",
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
                  {t("about.business.title")}
                </Typography>
                <Stack spacing={1.1}>
                  {businessReasons.map((k) => (
                    <Typography key={k} color="text.secondary">
                      - {t(k)}
                    </Typography>
                  ))}
                </Stack>
              </CardContent>
            </MotionCard>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <MotionCard
              {...sectionFade}
              sx={{
                height: "100%",
                bgcolor: isDark ? "rgba(17,24,39,0.9)" : "background.paper",
                border: "1px solid",
                borderColor: isDark ? "rgba(148,163,184,0.2)" : "divider",
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
                  {t("about.users.title")}
                </Typography>
                <Stack spacing={1.1}>
                  {userReasons.map((k) => (
                    <Typography key={k} color="text.secondary">
                      - {t(k)}
                    </Typography>
                  ))}
                </Stack>
              </CardContent>
            </MotionCard>
          </Grid>
        </Grid>

        {/* <MotionBox {...sectionFade} sx={{ mb: { xs: 6, md: 8 } }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
            {t("about.pricing.title")}
          </Typography>
          <Grid container spacing={2}>
            {pricingPlans.map((plan) => (
              <Grid size={{ xs: 12, md: 4 }} key={plan.key}>
                <Card
                  sx={{
                    height: "100%",
                    borderColor: plan.highlight ? "secondary.main" : "divider",
                    borderWidth: plan.highlight ? 2 : 1,
                    borderStyle: "solid",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {plan.highlight ? (
                    <Chip
                      label={t("about.pricing.recommended")}
                      color="secondary"
                      size="small"
                      sx={{ position: "absolute", top: 12, right: 12, fontWeight: 800 }}
                    />
                  ) : null}
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center" mb={1.2}>
                      <Box color="primary.main">{plan.icon}</Box>
                      <Typography sx={{ fontWeight: 800 }}>
                        {t(`about.pricing.${plan.key}.name`)}
                      </Typography>
                    </Stack>
                    <Typography variant="h4" sx={{ fontWeight: 900, mb: 1 }}>
                      {t(`about.pricing.${plan.key}.price`)}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                      {t(`about.pricing.${plan.key}.desc`)}
                    </Typography>
                    <Stack spacing={0.7}>
                      {[1, 2, 3].map((n) => (
                        <Typography variant="body2" key={`${plan.key}-${n}`} color="text.secondary">
                          - {t(`about.pricing.${plan.key}.point${n}`)}
                        </Typography>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </MotionBox> */}

        {/* <MotionBox {...sectionFade} sx={{ mb: { xs: 6, md: 8 } }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
            {t("about.blog.title")}
          </Typography>
          <Grid container spacing={2}>
            {blogPosts.map((postKey) => (
              <Grid size={{ xs: 12, md: 4 }} key={postKey}>
                <Card sx={{ height: "100%" }}>
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={1} mb={1}>
                      <Chip size="small" label={t(`${postKey}.tag`)} />
                      <Typography variant="caption" color="text.secondary">
                        {t(`${postKey}.meta`)}
                      </Typography>
                    </Stack>
                    <Typography sx={{ fontWeight: 800, mb: 0.8 }}>
                      {t(`${postKey}.title`)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t(`${postKey}.excerpt`)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </MotionBox> */}

        <MotionBox {...sectionFade} sx={{ mb: { xs: 6, md: 8 } }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
            {t("about.faq.title")}
          </Typography>
          <Stack spacing={1}>
            {faqs.map((faqKey) => (
              <Accordion
                key={faqKey}
                disableGutters
                sx={{
                  bgcolor: isDark ? "rgba(17,24,39,0.9)" : "background.paper",
                  border: "1px solid",
                  borderColor: isDark ? "rgba(148,163,184,0.2)" : "divider",
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography sx={{ fontWeight: 700 }}>{t(faqKey)}</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography color="text.secondary">
                    {t(`${faqKey}.a`)}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        </MotionBox>

        {/* <MotionBox {...sectionFade}>
          <Card>
            <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                {t("about.contact.title")}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 2.2 }}>
                {t("about.contact.subtitle")}
              </Typography>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label={t("about.contact.name")} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField fullWidth label={t("about.contact.email")} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    label={t("about.contact.message")}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.3}
                    alignItems={{ sm: "center" }}
                    justifyContent="space-between"
                  >
                    <Typography variant="body2" color="text.secondary">
                      {t("about.contact.note")}
                    </Typography>
                    <Button variant="contained">
                      {t("about.contact.send")}
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </MotionBox> */}
      </Container>
    </Box>
  );
};

export default AboutPage;
