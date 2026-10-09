import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Box,
  Container,
  Typography,
  Link,
  Divider,
  CssBaseline,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import SideMenu from '../components/dashboard/SideMenu';
import { APP_VERSION, APP_COMMIT, APP_BUILD_DATE } from '../config/version';

const TABS = ['about', 'faq', 'terms', 'privacy'];

const StepBlock = ({ number, title, subtitle, children }) => (
  <Box sx={{ mb: 5 }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
      <Box sx={{
        minWidth: 36, height: 36, borderRadius: '50%',
        bgcolor: '#FFE08D',
        display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.3,
      }}>
        <Typography sx={{ color: '#171516', fontWeight: 'bold', fontSize: '0.95rem' }}>{number}</Typography>
      </Box>
      <Box>
        <Typography variant="h5" fontWeight="bold" component="h3">{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontStyle: 'italic' }}>{subtitle}</Typography>
        )}
      </Box>
    </Box>
    <Box sx={{ pl: { xs: 0, sm: '52px' } }}>{children}</Box>
  </Box>
);

const CanonBlock = ({ color = 'primary.main', label, children }) => (
  <Box sx={{ pl: 2, borderLeft: '4px solid', borderColor: color, mb: 3 }}>
    <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>{label}</Typography>
    {children}
  </Box>
);

const RefCitation = ({ children }) => (
  <Box sx={{ pl: 2, borderLeft: '3px solid', borderColor: 'grey.300', py: 0.5, mb: 2 }}>
    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>{children}</Typography>
  </Box>
);

const PageFooter = ({ isAuthenticated }) => (
  <>
    <Divider sx={{ my: 6 }} />
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, pb: 4, flexWrap: 'wrap' }}>
      <Link component={RouterLink} to="/about?tab=about" underline="hover" variant="body2" color="text.secondary">About</Link>
      <Link component={RouterLink} to="/about?tab=faq" underline="hover" variant="body2" color="text.secondary">FAQ</Link>
      <Link component={RouterLink} to="/about?tab=terms" underline="hover" variant="body2" color="text.secondary">Terms of Use</Link>
      <Link component={RouterLink} to="/about?tab=privacy" underline="hover" variant="body2" color="text.secondary">Privacy Policy</Link>
      {!isAuthenticated && (
        <Link component={RouterLink} to="/login" underline="hover" variant="body2" color="primary">Sign in / Register</Link>
      )}
    </Box>
    <Typography variant="caption" color="text.disabled" sx={{ display: 'block', textAlign: 'center', pb: 4 }}>
      CitSciSort {APP_VERSION}{APP_COMMIT ? ` · build ${APP_COMMIT}` : ''}{APP_BUILD_DATE ? ` · ${APP_BUILD_DATE}` : ''}
    </Typography>
  </>
);

const AboutTab = ({ isAuthenticated }) => (
  <>
    <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>About</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
      A collaborative platform to classify, analyse and map the global corpus of peer-reviewed scientific publications on Citizen Science (CS).
    </Typography>

    <Divider sx={{ my: 4 }} />

    {/* ── WHAT IS CITSCISORT ───────────────────────────────────── */}
    <Box sx={{ mb: 6 }}>
      <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>
        What is CitSci Sort?
      </Typography>
      <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
        CitSci Sort is a community-driven classification tool developed by the{' '}
        <Link href="https://ibercivis.es" target="_blank" rel="noopener noreferrer"><strong>Ibercivis Foundation</strong></Link> in the context of the{' '}
        <Link href="https://concept.riecs.eu/" target="_blank" rel="noopener noreferrer"><strong>RIECS-Concept</strong></Link> initiative (<em>Towards a Pan-European Research
        Infrastructure for Excellent Citizen Science</em>), which brings together 13 partners from
        8 countries. Its purpose is to build a systematically categorized corpus of scientific
        abstracts on CS — one that did not previously exist with a shared, transparent classification
        scheme. The corpus is drawn
        from peer-reviewed publications identified through a systematic search of the{' '}
        <strong>Web of Science</strong> database, accessed via the{' '}
        <strong>Universidad de Zaragoza</strong>'s institutional licence. The abstracts are
        publicly available from the original publication sources, which remain the authoritative
        reference for each record.
      </Typography>
      <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
        While numerous projects and well-established networks exist within citizen science, the field
        continues to struggle with <strong>fragmented data and a lack of shared standards</strong>.
        This lack of <strong>interoperability</strong> hinders the <strong>scalability</strong> of
        its collective scientific impact and poses a significant challenge to its{' '}
        <strong>long-term sustainability and future viability</strong>. CitSci Sort responds by
        producing a shared, evidence-based taxonomy that makes the landscape of CS research legible —
        across disciplines, methods, and platforms.
      </Typography>
      <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
        CitSci Sort has a dual goal. First, it produces a <strong>research dataset</strong>: a
        structured map of how CS is studied, practiced, and theorized across disciplines.
        Second, it is a <strong>learning tool</strong>: by reading and classifying real abstracts,
        contributors actively develop their own understanding of the landscape of CS publications —
        what questions the field asks, how it frames them, and where the debates are.
      </Typography>
      <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
        Within <Link href="https://concept.riecs.eu/" target="_blank" rel="noopener noreferrer">RIECS-Concept</Link>, CitSci Sort specifically addresses two research questions: what types
        of CS research are being produced, and what <strong>technologies and
        infrastructures</strong> support CS projects. Both dimensions are captured
        directly in the classification scheme.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
        Collaborators may choose to remain fully anonymous or request public recognition and
        attribution in project reports and results, strictly according to their express consent.
      </Typography>
    </Box>

    <Divider sx={{ my: 6 }} />

    {/* ── CLASSIFICATION FRAMEWORK ─────────────────────────────── */}
    <Box sx={{ mb: 2 }}>
      <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>
        The Classification Framework
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 4 }}>
        The classification proceeds in <strong>three sequential steps</strong>. Each step is grounded
        in published references; where frameworks were developed for science in general, their
        application here is explicitly adapted to the CS domain.
      </Typography>
    </Box>

    {/* ── STEP 1 ───────────────────────────────────────────────── */}
    <StepBlock
      number="1"
      title="First-level Dichotomy"
      subtitle="Is Citizen Science the tool used to produce knowledge, or the subject being studied?"
    >
      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 3 }}>
        Every abstract is first assigned to one of three mutually exclusive categories. This
        dichotomy distinguishes papers that <em>use</em> CS as a research method from
        papers whose object of study <em>is</em> CS itself.
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><strong>Category</strong></TableCell>
              <TableCell><strong>What it captures</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell sx={{ verticalAlign: 'top', minWidth: 150 }}>
                <strong>Findings <em>through</em> Citizen Science</strong>
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                <em>In this paper, citizen science is the method, not the topic.</em> The research
                investigates something — a question, a problem, a phenomenon — and citizen science is
                how the investigation was carried out. The paper's main findings are claims about that
                question, problem, or phenomenon; they are not claims about citizen science itself.
                Participation can take many forms (observation, data collection, co-investigation,
                problem framing, community partnership): what matters for this category is the role CS
                plays in the paper, not how deep the participation goes.
                <Box component="span" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                  Examples: new species discoveries, supernova observations, biodiversity mapping,
                  air-quality monitoring, disease surveillance, community-led assessments of local
                  environmental problems, participatory mapping of urban inequalities, collaborative
                  mathematical proofs.
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ verticalAlign: 'top', minWidth: 150 }}>
                <strong>Findings <em>about</em> Citizen Science</strong>
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                <em>In this paper, citizen science is the topic, not the method.</em> The research
                investigates citizen science itself — how it works, who participates, what it produces,
                how it should be done, what it means. This category brings together two complementary
                modes that, in CS, are typically intertwined within the same paper: research that builds
                or improves the practice of CS (new methods, protocols, platforms, validation systems,
                frameworks) and research that analyses it as a phenomenon (participation, impact, ethics,
                politics, epistemology).
                <Box component="span" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                  Examples: validating volunteer-collected data against expert measurements, designing a
                  new contribution platform, studying participants' motivations, assessing policy uptake
                  of CS projects, theorising the epistemic role of lay knowledge, proposing a new
                  framework for co-design.
                </Box>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell sx={{ verticalAlign: 'top', minWidth: 150 }}>
                <strong>Not sure / Can't decide</strong>
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', lineHeight: 1.7 }}>
                The abstract does not provide enough information to decide, or the case is genuinely
                ambiguous. This is a valid and informative answer: cases that resist classification help
                reveal where the boundaries between categories are less clear, and they are reviewed
                separately by the research team.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mb: 3, p: 2, bgcolor: 'warning.50', borderLeft: '4px solid', borderColor: 'warning.main', borderRadius: 1 }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Rule of thumb</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
          Ask what the paper would be about if the CS dimension were removed. If a substantive
          scientific finding about something else remains, it is <em>Findings through CS</em>. If what
          remains is a study of how CS works, who participates, or what effects it produces, it is{' '}
          <em>Findings about CS</em>.
        </Typography>
      </Box>

      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
        The distinction is not unique to citizen science
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 3 }}>
        Large-scale research infrastructures across disciplines are routinely studied along the same
        axis. Bibliometric work on telescopes separates papers that <em>use</em> observational data
        from papers that <em>describe or develop</em> the facility itself (Grothkopf &amp; Lagerstrom,
        2011; Lagerstrom et al., 2024). Scientometric studies of the LHC distinguish physics
        discoveries enabled by the accelerator from research on detectors, reconstruction algorithms
        and collaboration structures (Carrazza et al., 2016). Recent work on AI and high-performance
        computing classifies publications as <em>"AI use"</em> versus <em>"AI development"</em>{' '}
        depending on whether they apply existing tools or build new ones — finding that papers
        combining both modes are up to three times more likely to introduce novel concepts and five
        times more likely to reach top-cited status than conventional work (Bianchini et al., 2025).
        Comparable distinctions structure the literature on biobanks. CitSci Sort applies this
        well-established logic to the CS literature — the novelty is not the dichotomy itself but its
        systematic application to the full peer-reviewed corpus of citizen science.
      </Typography>

      <Box sx={{ mb: 3, p: 2, bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Two intellectual traditions behind this dichotomy in CS
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
          Within citizen science specifically, the distinction maps loosely onto two foundational
          traditions. <strong>Rick Bonney</strong>'s tradition focuses on volunteers as contributors
          to field observations coordinated by professional scientists — CS as a method to scale
          data collection in ecology and biology. <strong>Alan Irwin</strong>'s tradition situates CS
          at the intersection of knowledge production and public participation, emphasizing an active
          "scientific citizenship" that shapes research agendas and responds to local concerns.
          Papers in <em>Findings through CS</em> largely reflect the Bonney tradition. Papers in{' '}
          <em>Findings about CS</em> draw on a broader set of disciplines — including sociology,
          psychology, education, science policy, ethics and philosophy of science — and many engage
          with the Irwin tradition, though not exclusively. Both traditions were early identified as
          intertwined (e.g., Socientize 2012–2014), and{' '}
          <Link href="https://concept.riecs.eu/" target="_blank" rel="noopener noreferrer">RIECS-Concept</Link>{' '}
          is designed to integrate these complementary views into a functional and operative infrastructure.
        </Typography>
      </Box>

      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>Grounding references</Typography>
      <RefCitation>
        Kullenberg, C., &amp; Kasperowski, D. (2016). What Is Citizen Science? — A Scientometric
        Meta-Analysis. <em>PLOS ONE</em>, 11(1), e0147152.{' '}
        <Link href="https://doi.org/10.1371/journal.pone.0147152" target="_blank" rel="noopener noreferrer">DOI</Link>
        <br />
        <Typography variant="caption" color="text.secondary">
          <strong>Primary anchor.</strong> Provides the CS-specific dichotomy: CS as method vs. CS as
          object of study.
        </Typography>
      </RefCitation>
      <RefCitation>
        Ioannidis, J. P. A., et al. (2015). Meta-research: Evaluation and Improvement of Research
        Methods and Practices. <em>PLOS Biology</em>, 13(10), e1002264.{' '}
        <Link href="https://doi.org/10.1371/journal.pbio.1002264" target="_blank" rel="noopener noreferrer">DOI</Link>
        <br />
        <Typography variant="caption" color="text.secondary">
          Establishes the legitimacy of studying research processes as a scientific discipline;
          structures part of Step 2.
        </Typography>
      </RefCitation>
      <RefCitation>
        Grothkopf, U., &amp; Lagerstrom, J. (2011). Telescope Bibliometrics 101.{' '}
        <Link href="https://arxiv.org/abs/1103.5474" target="_blank" rel="noopener noreferrer">arXiv:1103.5474</Link>
      </RefCitation>
      <RefCitation>
        Carrazza, S., et al. (2016). Research infrastructures in the LHC era: a scientometric approach.{' '}
        <Link href="https://arxiv.org/abs/1601.03746" target="_blank" rel="noopener noreferrer">arXiv:1601.03746</Link>
      </RefCitation>
      <RefCitation>
        Bianchini, S., et al. (2025). AI and Supercomputing are Powering the Next Wave of Breakthrough
        Science.{' '}
        <Link href="https://arxiv.org/abs/2511.12686" target="_blank" rel="noopener noreferrer">arXiv:2511.12686</Link>
      </RefCitation>
    </StepBlock>

    {/* ── STEP 1 → STEP 2 CONNECTOR ────────────────────────────── */}
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 2, my: 3, pl: { xs: 0, sm: '52px' },
    }}>
      <Box sx={{ width: 2, height: 32, bgcolor: 'primary.light', ml: 2.2 }} />
      <Chip
        label="The following step applies only when Step 1 = Findings about Citizen Science"
        size="small"
        variant="outlined"
        color="primary"
        sx={{ fontSize: '0.75rem', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }}
      />
    </Box>

    {/* ── STEP 2 ───────────────────────────────────────────────── */}
    <StepBlock
      number="2"
      title="Dimensions of Citizen Science Studied"
      subtitle="Which dimension of citizen science does this paper analyse?"
    >
      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 3 }}>
        When a paper is classified as <em>Findings about CS</em>, one or more dimensions must be
        selected to capture which specific aspect of CS it analyses or develops. Multiple selections
        are expected — many papers span more than one dimension. The dimensions are adapted from two
        canonical frameworks to the CS domain.
      </Typography>

      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><strong>Dimension</strong></TableCell>
              <TableCell><strong>What it captures</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ['Methodology & Design', 'Project design, protocols, task design, sampling strategies, data-collection methods, workflows, co-design with participants, standardization, best practices.'],
              ['Data Quality & Validation', 'Accuracy and trustworthiness of data collected by volunteers: validation methods, agreement with expert/reference data, inter-rater reliability, bias correction, uncertainty, quality control, data cleaning and filtering.'],
              ['Impact & Outcomes', 'What CS produces beyond data collection: scientific outputs (publications, discoveries), educational and learning outcomes, policy uptake, behaviour change, community benefits, environmental/conservation outcomes, science literacy.'],
              ['Participation & Engagement', 'How participants engage with CS: motivations, retention, recruitment, demographics, inclusion and diversity, barriers to participation, drop-out, contributor typology, volunteer behaviour.'],
              ['Ethics & Legal', 'Privacy, data ownership, authorship and credit attribution, informed consent, intellectual property, safety, equity and accessibility, FAIR data principles, power dynamics, extractive practices.'],
              ['Theory & Framework', 'Definitions, typologies, theoretical frameworks, conceptual models, historical analysis, epistemology of CS.'],
              ['Technology & Platforms', 'Mobile apps, platforms (iNaturalist, Zooniverse, eBird and similar), sensors and IoT, gamification design, AI and machine-learning assistance, automated classification, dashboards and data visualization, infrastructure, interoperability.'],
            ].map(([n, d]) => (
              <TableRow key={n}>
                <TableCell sx={{ verticalAlign: 'top', minWidth: 150 }}><strong>{n}</strong></TableCell>
                <TableCell sx={{ color: 'text.secondary', lineHeight: 1.7 }}>{d}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 4 }}>
        Each dimension covers both <strong>propositive contributions</strong> (papers that design,
        build or improve that aspect of CS) and <strong>analytical contributions</strong> (papers that
        study or evaluate it). In CS, these two modes are typically intertwined within the same
        publication: a paper proposing a new validation protocol normally analyses existing ones in
        the process. The classification reflects this by grouping along the dimension addressed rather
        than the paper's stance toward it.
      </Typography>

      {/* First Canon */}
      <CanonBlock color="primary.main" label="First Canon">
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Ioannidis et al. (2015) — research-on-research pillars
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
          Ioannidis and colleagues established that research on research practices is itself a
          legitimate scientific discipline, and proposed five foundational pillars for studying it.
          Harpe (2021) added a sixth. We adapt these pillars to the CS domain, where "Methods" maps to
          how CS projects are designed, "Reproducibility" to data quality, and so on.
        </Typography>
        <RefCitation>
          Ioannidis, J. P. A., et al. (2015). Meta-research: Evaluation and Improvement of Research
          Methods and Practices. <em>PLOS Biology</em>, 13(10), e1002264.{' '}
          <Link href="https://doi.org/10.1371/journal.pbio.1002264" target="_blank" rel="noopener noreferrer">DOI</Link>
        </RefCitation>
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>Pillar</strong></TableCell>
                <TableCell><strong>What it studies</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ['Methods', 'How research is performed'],
                ['Reporting', 'How research is communicated'],
                ['Reproducibility', 'How research is verified'],
                ['Evaluation', 'How research is reviewed and funded'],
                ['Incentives', 'How research is rewarded'],
                ['Organization (Harpe 2021)', 'How research is organized and categorized'],
              ].map(([p, d]) => (
                <TableRow key={p}>
                  <TableCell><strong>{p}</strong></TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{d}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CanonBlock>

      {/* Second Canon */}
      <CanonBlock color="secondary.main" label="Second Canon">
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          UNESCO (2021) — Recommendation on Open Science
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
          The UNESCO Recommendation on Open Science (2021) defines a comprehensive framework
          for open science practices. For the purposes of this classification, we use the six
          dimensions most directly applicable to the CS domain, which map onto the aspects
          used in Step 2.
        </Typography>
        <RefCitation>
          UNESCO. (2021). <em>UNESCO Recommendation on Open Science</em>. UNESCO Publishing.{' '}
          <Link href="https://doi.org/10.54677/MNMH8546" target="_blank" rel="noopener noreferrer">DOI</Link>
        </RefCitation>
        <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>UNESCO Dimension</strong></TableCell>
                <TableCell><strong>What it covers</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[
                ['Open Scientific Knowledge', 'Open access to publications, data, software, and research outputs'],
                ['Scientific Integrity', 'Ethics, reproducibility, and responsible conduct in research'],
                ['Open Evaluation', 'Transparent and inclusive peer review and assessment processes'],
                ['Open Engagement', 'Participation of society in scientific knowledge production'],
                ['Values & Principles', 'Equity, inclusion, and shared governance of science'],
                ['Open Science Infrastructure', 'Tools, platforms, and systems enabling open science'],
              ].map(([k, d]) => (
                <TableRow key={k}>
                  <TableCell><strong>{k}</strong></TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{d}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CanonBlock>

      {/* Bi-canonical mapping */}
      <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
        Bi-canonical Mapping
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.8 }}>
        The seven dimensions map onto the two canons as follows. Dimensions with no direct canonical
        anchor are CS-specific additions required by the domain.
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', mb: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><strong>Aspect</strong></TableCell>
              <TableCell><strong>Ioannidis 2015</strong></TableCell>
              <TableCell><strong>UNESCO 2021</strong></TableCell>
              <TableCell><strong>Coverage</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ['Methodology & Design', 'Methods', 'Open Scientific Knowledge', 'dual'],
              ['Data Quality & Validation', 'Reproducibility + Methods', 'Scientific Integrity', 'dual'],
              ['Impact & Outcomes', 'Evaluation', 'Open Evaluation', 'dual'],
              ['Participation & Engagement', '—', 'Open Engagement', 'direct'],
              ['Ethics & Legal', '—', 'Values & Principles', 'direct'],
              ['Technology & Platforms', '—', 'Open Science Infrastructure', 'direct'],
              ['Theory & Framework', '—', '—', 'none'],
            ].map(([aspect, io, rri, type]) => (
              <TableRow key={aspect}>
                <TableCell><strong>{aspect}</strong></TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{io}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{rri}</TableCell>
                <TableCell>
                  <Chip
                    label={type === 'dual' ? 'Dual canon' : type === 'direct' ? 'Direct canon' : 'CS-specific'}
                    size="small"
                    color={type === 'dual' ? 'success' : type === 'direct' ? 'primary' : 'default'}
                    variant={type === 'none' ? 'outlined' : 'filled'}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </StepBlock>

    {/* ── STEP 2 → STEP 3 CONNECTOR ────────────────────────────── */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 3, pl: { xs: 0, sm: '52px' } }}>
      <Box sx={{ width: 2, height: 32, bgcolor: 'secondary.light', ml: 2.2 }} />
      <Chip
        label="The following step applies to all papers, regardless of Step 1"
        size="small"
        variant="outlined"
        color="secondary"
        sx={{ fontSize: '0.75rem', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }}
      />
    </Box>

    {/* ── STEP 3 ───────────────────────────────────────────────── */}
    <StepBlock
      number="3"
      title="Infrastructure Classification"
      subtitle="Does the paper mention specific platforms, tools, or technologies used in the CS project?"
    >
      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8, mb: 3 }}>
        Independently of whether a paper is classified as <em>Findings through CS</em> or{' '}
        <em>Findings about CS</em>, every abstract is also assessed for whether it mentions specific{' '}
        <strong>CS infrastructures</strong> — platforms, mobile apps, data-management tools, AI
        systems, or any other technology that enables or supports the CS project described.
      </Typography>

      <Box sx={{
        p: 2.5, mb: 3,
        bgcolor: 'secondary.50',
        border: '1px solid',
        borderColor: 'secondary.light',
        borderRadius: 2,
      }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom color="secondary.dark">
          Why this step is essential for{' '}
          <Link href="https://concept.riecs.eu/" target="_blank" rel="noopener noreferrer">RIECS-Concept</Link>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
          One of the two core research questions driving{' '}
          <Link href="https://concept.riecs.eu/" target="_blank" rel="noopener noreferrer">RIECS-Concept</Link>{' '}
          is: <em>what technologies and infrastructures currently support CS projects across Europe?</em>{' '}
          No systematic, evidence-based map of these infrastructures currently exists. This step builds
          that map directly from the published literature — identifying which platforms appear, how
          frequently, and in what research contexts. The resulting dataset will directly inform the
          design of a pan-European research infrastructure for CS.
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 3 }}>
        Classifiers are asked to indicate whether the abstract mentions any infrastructure, and if so
        to name it. Known platforms are suggested via autocomplete; new ones can be added freely.
        Over time, this builds a verified, community-sourced registry of CS
        infrastructures anchored in the literature.
      </Typography>

      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
        Three waves of citizen science platforms
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8, mb: 2 }}>
        Research on CS infrastructures identifies three historical waves of CS platform development
        (Senabre Hidalgo et al., 2025). Understanding this evolution contextualizes what this
        classification step captures:
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ overflowX: 'auto', mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell><strong>Wave</strong></TableCell>
              <TableCell><strong>Focus</strong></TableCell>
              <TableCell><strong>Examples of functionality</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              ['First', 'Technological development & volunteer engagement', 'Technical documentation, volunteer recruitment, data submission forms'],
              ['Second', 'Monitoring & openness', 'Environmental observation systems, data transparency, open repositories'],
              ['Third', 'Frontier technologies', 'AI-assisted classification, federated data, real-time IoT sensors, cloud analytics'],
            ].map(([w, f, e]) => (
              <TableRow key={w}>
                <TableCell><strong>{w}</strong></TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{f}</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>{e}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
        The infrastructure registry built through this classification step will feed directly into
        the RIECS-Concept roadmap for inclusion in the{' '}
        <strong>European Strategic Forum on Research Infrastructures (ESFRI)</strong> and
        integration with the <strong>European Open Science Cloud (EOSC)</strong>.
      </Typography>
    </StepBlock>

    <Divider sx={{ my: 6 }} />

    {/* ── IBERCIVIS + RIECS ────────────────────────────────────── */}
    <Box sx={{ mb: 6 }}>
      <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>Ibercivis Foundation</Typography>
      <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
        <Link href="https://ibercivis.es" target="_blank" rel="noopener noreferrer"><strong>Ibercivis</strong></Link> is a private non-profit foundation that promotes Citizen Science in Spain and Europe.
        Formally constituted on 14 November 2011 in Madrid, it evolved from the Zivis project launched in April 2007 — one of the earliest distributed volunteer computing initiatives in Spain.
        Its board of trustees brings together leading Spanish research institutions, including the{' '}
        <strong>Universidad de Zaragoza</strong>, the <strong>CSIC</strong>, the <strong>CIEMAT</strong>,
        the <strong>Ministry of Science and Innovation</strong>, the <strong>Government of Aragon</strong>,
        and the <strong>Fundación Zaragoza Ciudad del Conocimiento</strong>.
      </Typography>
      <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
        Over its trajectory, Ibercivis has developed more than <strong>100 citizen science projects</strong> across
        a wide range of domains — from environmental monitoring (<em>Vigilantes del Aire</em>, <em>D-Noses</em>)
        to biodiversity (<em>Pájaros en la Nube</em>) and aerospace education (<em>Proyecto Aeroespacial Servet</em>,
        with ten editions). It also hosts the{' '}
        <strong>Observatorio de la Ciencia Ciudadana en España</strong>, the national reference point for
        tracking the state of CS in the country.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
        Learn more at{' '}
        <Link href="https://ibercivis.es" target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 500 }}>ibercivis.es</Link>
      </Typography>
    </Box>

    <Box sx={{ mb: 6 }}>
      <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>RIECS-Concept</Typography>
      <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
        <Link href="https://concept.riecs.eu/" target="_blank" rel="noopener noreferrer"><strong>RIECS-Concept</strong></Link> (<em>Towards a Pan-European Research Infrastructure for
        Excellent Citizen Science</em>) is a 36-month Horizon Europe project that began on
        1 January 2025. It is coordinated by the{' '}
        <Link href="https://ibercivis.es" target="_blank" rel="noopener noreferrer">Ibercivis Foundation</Link>{' '}
        and co-coordinated by{' '}
        <Link href="https://www.ecsa.ngo/" target="_blank" rel="noopener noreferrer">ECSA</Link>,{' '}
        together with a consortium of European partners. Its goal is to design a conceptual model for a
        permanent, pan-European research infrastructure for CS — including a feasibility study
        and a five-year implementation plan — with a view to inclusion in the{' '}
        <strong>European Strategic Forum on Research Infrastructures (ESFRI)</strong> and
        interoperability with the <strong>European Open Science Cloud (EOSC)</strong>.
      </Typography>
      <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
        The project follows a four-step methodology: (1) primary and secondary desktop research
        to map the existing landscape; (2) active stakeholder engagement through in-person and
        virtual activities with ten groups including citizens, researchers, policymakers, and
        NGOs; (3) user-story analysis to synthesize findings into actionable requirements; and
        (4) continuous impact evaluation to ensure the infrastructure design responds to real
        community needs.
      </Typography>
      <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
        A core insight driving{' '}
        <Link href="https://concept.riecs.eu/" target="_blank" rel="noopener noreferrer">RIECS-Concept</Link>{' '}
        is the concept of a <strong>meta-organization</strong> — an
        entity composed of other organizations and individuals that interact to achieve shared
        objectives (Harpe, 2021). By federating fragmented CS initiatives under a unified
        governance and data model,{' '}
        <Link href="https://concept.riecs.eu/" target="_blank" rel="noopener noreferrer">RIECS-Concept</Link>{' '}
        aims to transform isolated volunteer efforts into a
        scientifically robust infrastructure capable of influencing health, environment, and
        climate policy at scale.
      </Typography>
      <Typography variant="body1" paragraph color="text.secondary" sx={{ lineHeight: 1.8 }}>
        CitSci Sort is open to anyone interested in contributing and it also supports Ibercivis'
        WP4 public engagement activities in RIECS-Concept. The distributed analysis carried out
        through the platform complements inputs gathered from other stakeholder groups through
        workshops, consultations and other participatory activities.
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>
        Learn more at{' '}
        <Link href="https://concept.riecs.eu/" target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 500 }}>concept.riecs.eu</Link>
      </Typography>
    </Box>

    <Divider sx={{ my: 6 }} />

    {/* ── REFERENCES ──────────────────────────────────────────── */}
    <Box sx={{ mb: 6 }}>
      <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>References</Typography>
      <Box component="ol" sx={{ pl: 3, color: 'text.secondary' }}>
        {[
          <>Bianchini, S., et al. (2025). AI and Supercomputing are Powering the Next Wave of Breakthrough Science — But at What Cost? <Link href="https://arxiv.org/abs/2511.12686" target="_blank" rel="noopener noreferrer">arXiv:2511.12686</Link></>,
          <>Bonney, R. (1996). Citizen Science: A lab tradition. <em>Living Bird</em>, 15(4), 7–15.</>,
          <>Carrazza, S., et al. (2016). Research infrastructures in the LHC era: a scientometric approach. <Link href="https://arxiv.org/abs/1601.03746" target="_blank" rel="noopener noreferrer">arXiv:1601.03746</Link></>,
          <>ECSA (2015). <em>Ten Principles of Citizen Science</em>. European Citizen Science Association.</>,
          <>Eitzel, M. V. et al. (2017). Citizen Science Terminology Matters. <em>Citizen Science: Theory and Practice</em>, 2(1), 1.</>,
          <>Grothkopf, U., &amp; Lagerstrom, J. (2011). Telescope Bibliometrics 101. <Link href="https://arxiv.org/abs/1103.5474" target="_blank" rel="noopener noreferrer">arXiv:1103.5474</Link></>,
          <>Haklay, M. (2013). Citizen science and volunteered geographic information. In <em>Crowdsourcing Geographic Knowledge</em>. Springer.</>,
          <>Harpe, S. E. (2021). Meta-research in pharmacy. <em>Research in Social and Administrative Pharmacy</em>, 17(12), 2028–2035.</>,
          <>Ioannidis, J. P. A., et al. (2015). Meta-research: Evaluation and Improvement of Research Methods and Practices. <em>PLOS Biology</em>, 13(10), e1002264. <Link href="https://doi.org/10.1371/journal.pbio.1002264" target="_blank" rel="noopener noreferrer">DOI</Link></>,
          <>Irwin, A. (1995). <em>Citizen Science: A Study of People, Expertise and Sustainable Development</em>. Routledge.</>,
          <>Kullenberg, C., &amp; Kasperowski, D. (2016). What Is Citizen Science? — A Scientometric Meta-Analysis. <em>PLOS ONE</em>, 11(1), e0147152. <Link href="https://doi.org/10.1371/journal.pone.0147152" target="_blank" rel="noopener noreferrer">DOI</Link></>,
          <>Lagerstrom, J., et al. (2024). Assessing your Observatory's Impact: Best Practices in Establishing and Maintaining Observatory Bibliographies. <Link href="https://arxiv.org/abs/2401.00060" target="_blank" rel="noopener noreferrer">arXiv:2401.00060</Link></>,
          <>Senabre Hidalgo, E., et al. (2025). Research Infrastructures in Citizen Science: State of Knowledge and Taxonomic Framework as a Pathway to Sustainability. <em>ResearchGate preprint</em>. <Link href="https://www.researchgate.net/publication/393484043" target="_blank" rel="noopener noreferrer">Link</Link></>,
          <>Shirk, J. L. et al. (2012). Public participation in scientific research. <em>Ecology and Society</em>, 17(2), 29.</>,
          <>UNESCO. (2021). <em>UNESCO Recommendation on Open Science</em>. UNESCO Publishing. <Link href="https://doi.org/10.54677/MNMH8546" target="_blank" rel="noopener noreferrer">DOI</Link></>,
        ].map((ref, i) => (
          <li key={i}>
            <Typography variant="body2" sx={{ lineHeight: 1.8, mb: 1 }}>{ref}</Typography>
          </li>
        ))}
      </Box>
    </Box>

    <PageFooter isAuthenticated={isAuthenticated} />
  </>
);

const TermsTab = ({ isAuthenticated }) => (
  <>
    <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>Terms of Use</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Last updated: April 2026</Typography>

    {[
      {
        n: '1', title: 'Acceptance of Terms',
        body: 'By accessing or using CitSci Sort ("the Platform"), you agree to be bound by these Terms of Use. If you do not agree, please do not use the Platform. The Platform is operated by the Ibercivis Foundation in the context of the RIECS-Concept initiative.',
      },
      {
        n: '2', title: 'Eligibility',
        body: 'You must be at least 18 years old to register. By creating an account, you represent that you meet this requirement and that the information you provide is accurate and complete.',
      },
      {
        n: '3', title: 'Your Contributions',
        body: 'When you classify abstracts, participate in debates, or submit comments, you grant Ibercivis Foundation a non-exclusive, royalty-free, worldwide licence to use, reproduce, and distribute your contributions for research, educational, and open-science purposes. You retain ownership of your contributions. You agree not to submit false, misleading, or harmful content. If you opt in via your account settings, your name may be included in the acknowledgments of publications or reports derived from this Platform, or you may be contacted regarding potential research collaboration opportunities.',
      },
      {
        n: '4', title: 'Acceptable Use',
        body: 'You agree not to: (a) use the Platform for any unlawful purpose; (b) attempt to gain unauthorized access to any part of the Platform or its infrastructure; (c) interfere with or disrupt the Platform\'s operation; (d) collect or harvest data from the Platform using automated means without prior written consent; (e) impersonate any person or entity.',
      },
      {
        n: '5', title: 'Open Data',
        body: 'Classification data generated through the Platform may be made publicly available as an open dataset for research and educational purposes. Individual user data is anonymized or aggregated before publication. See our Privacy Policy for details.',
      },
      {
        n: '6', title: 'Intellectual Property',
        body: 'The Platform, its design, and its original content are owned by the Ibercivis Foundation. The scientific abstracts displayed are sourced from published academic literature and remain the property of their respective publishers and authors. Your use of the Platform does not grant you any rights over these materials.',
      },
      {
        n: '7', title: 'Disclaimer of Warranties',
        body: 'The Platform is provided "as is" without warranties of any kind, express or implied. Ibercivis Foundation does not warrant that the Platform will be uninterrupted, error-free, or free of harmful components.',
      },
      {
        n: '8', title: 'Limitation of Liability',
        body: 'To the maximum extent permitted by applicable law, Ibercivis Foundation shall not be liable for any indirect, incidental, or consequential damages arising from your use of, or inability to use, the Platform.',
      },
      {
        n: '9', title: 'Changes to These Terms',
        body: 'We may update these Terms at any time. Continued use of the Platform after changes are posted constitutes acceptance of the revised Terms. We will notify registered users of material changes by email.',
      },
      {
        n: '10', title: 'Governing Law',
        body: 'These Terms are governed by the laws of Spain. Any disputes shall be subject to the exclusive jurisdiction of the courts of Zaragoza, Spain.',
      },
      {
        n: '11', title: 'Contact',
        body: 'For questions about these Terms, please contact us at ethics@ibercivis.es.',
      },
    ].map(({ n, title, body }) => (
      <Box key={n} sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>{n}. {title}</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>{body}</Typography>
      </Box>
    ))}

    <PageFooter isAuthenticated={isAuthenticated} />
  </>
);

const PrivacyTab = ({ isAuthenticated }) => (
  <>
    <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>Privacy Policy</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>Last updated: April 2026</Typography>

    {[
      {
        n: '1', title: 'Who We Are',
        body: 'CitSci Sort is operated by the Ibercivis Foundation (Fundación Ibercivis), a non-profit organization based in Zaragoza, Spain. We are the data controller for the personal data collected through this Platform.',
      },
      {
        n: '2', title: 'Data We Collect',
        body: 'We collect: (a) Account data: email address, display name, and password (hashed) when you register; (b) Google Sign-In data: if you use Google login, we receive your email address and public profile name from Google; (c) Activity data: your classifications, debate contributions, comments, and timestamps; (d) Technical data: IP address, browser type, and session information collected automatically when you use the Platform.',
      },
      {
        n: '3', title: 'How We Use Your Data',
        body: 'We use your data to: operate and improve the Platform; attribute your contributions to your account; generate anonymized research datasets; send you notifications about debates you follow; and communicate important updates about the Platform. If you have opted in via your account settings, we may also use your name and contact details to include you in the acknowledgments of publications or reports derived from this Platform, or to contact you regarding potential research collaboration opportunities. These uses are based solely on your explicit consent and can be withdrawn at any time from your account settings.',
      },
      {
        n: '4', title: 'Legal Basis for Processing (GDPR)',
        body: 'We process your data on the following legal bases: (a) Contract: processing necessary to provide the service you registered for; (b) Legitimate interest: improving the Platform and conducting research; (c) Consent: for optional communications such as newsletters (where applicable).',
      },
      {
        n: '5', title: 'Data Sharing',
        body: 'We do not sell your personal data. We may share anonymized or aggregated classification data publicly as part of our open-science commitment. We use third-party services (such as hosting providers) who act as data processors under appropriate data processing agreements. We may disclose data if required by law. If you have opted in to acknowledgments or research collaboration, your name may appear in publications or reports produced in the context of the RIECS-Concept project; this sharing is limited to your display name and is conditioned entirely on your explicit opt-in.',
      },
      {
        n: '6', title: 'Data Retention',
        body: 'We retain your account data for as long as your account is active. Classification and contribution data may be retained indefinitely in anonymized form as part of the research dataset. You may request deletion of your personal data at any time (see Section 8).',
      },
      {
        n: '7', title: 'Cookies',
        body: 'We use session cookies necessary for authentication and security. We do not use advertising or tracking cookies. You can disable cookies in your browser settings, but this may affect your ability to log in.',
      },
      {
        n: '8', title: 'Your Rights',
        body: 'Under GDPR, you have the right to: access the personal data we hold about you; correct inaccurate data; request deletion of your data ("right to be forgotten"); object to or restrict processing; data portability. To exercise any of these rights, contact us through ibercivis.es.',
      },
      {
        n: '9', title: 'International Transfers',
        body: 'Your data is stored and processed within the European Economic Area (EEA). If any transfer outside the EEA occurs, we ensure appropriate safeguards are in place in accordance with GDPR.',
      },
      {
        n: '10', title: 'Children\'s Privacy',
        body: 'The Platform is not directed to children under 18. We do not knowingly collect personal data from children under 18. If you believe a child has provided us with personal data, please contact us and we will delete it.',
      },
      {
        n: '11', title: 'Changes to This Policy',
        body: 'We may update this Privacy Policy from time to time. We will notify you of significant changes by email. Continued use of the Platform after changes are posted constitutes acceptance of the revised Policy.',
      },
      {
        n: '12', title: 'Contact & Complaints',
        body: 'For privacy questions, contact us at ethics@ibercivis.es. You also have the right to lodge a complaint with the Spanish Data Protection Authority (AEPD) at aepd.es.',
      },
    ].map(({ n, title, body }) => (
      <Box key={n} sx={{ mb: 4 }}>
        <Typography variant="h6" fontWeight="bold" gutterBottom>{n}. {title}</Typography>
        <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.8 }}>{body}</Typography>
      </Box>
    ))}

    <PageFooter isAuthenticated={isAuthenticated} />
  </>
);

const FAQ_ITEMS = [
  {
    q: 'What is the difference between the two main categories?',
    a: "Findings through Citizen Science covers papers where citizen science is the method, not the topic. The research investigates something — a species, a pollutant, a community problem, a mathematical conjecture — and CS is how it got investigated. The paper's main findings are claims about that thing, not about citizen science itself. Findings about Citizen Science covers papers where citizen science is the topic, not the method. The research investigates CS itself — how it works, who participates, what it produces, how it should be done, what it means. This includes both papers that build or improve the practice of CS (new methods, validation systems, platform designs, frameworks) and papers that analyse CS as a phenomenon (motivation studies, impact assessments, ethical critiques). Both kinds belong to the same category because in CS the two modes are typically intertwined within the same paper.",
  },
  {
    q: 'What if citizen science is both the topic and the method of the paper?',
    a: 'Some papers investigate citizen science by using citizen science — for example, a project where volunteers help analyse the CS literature itself, or a participatory study evaluating CS platforms. These cases are reflexive but not ambiguous: classify them as Findings about CS. The criterion is where the knowledge claim points, not what method was used to produce it. The fact that CS appears on both sides of the research design is methodologically interesting but does not change the object of study.',
  },
  {
    q: 'What if a paper uses both citizen science measurements and official/traditional measurements?',
    a: 'Choose the classification that best reflects the primary purpose of the paper. If the CS data is the main subject of study — for example, the paper exists to validate or compare CS-collected data against expert measurements — it likely falls under Findings about CS (specifically, Data Quality & Validation). If the official measurements are the focus and CS data is used as a complement to produce findings about the world, choose Findings through CS. When in doubt, ask yourself: what would the paper be about if you removed one of the two data sources?',
  },
  {
    q: 'What if a paper builds a new CS platform or proposes a new method?',
    a: 'It falls under Findings about Citizen Science. The category includes both research that analyses CS and research that proposes new tools, protocols or frameworks for it. In Step 2, you would then select the dimension that best captures the contribution — typically Technology & Platforms, Methodology & Design, or Data Quality & Validation, depending on the focus.',
  },
  {
    q: 'Can I classify a paper I already know?',
    a: 'Yes — and your prior knowledge can help. But try to base your classification on what the abstract actually says, not on assumptions about the full paper. The corpus is built from abstracts, and consistency across classifiers depends on everyone working from the same visible information.',
  },
  {
    q: 'What if the abstract is unclear or too short to classify?',
    a: "Do your best with the available information. If a confident classification is not possible, choose Not sure / Can't decide — this is a valid and informative answer. You can also leave a comment explaining your uncertainty, and open a debate so other classifiers can discuss it.",
  },
  {
    q: 'What if I disagree with how other classifiers classified a paper?',
    a: 'That is expected and valuable. Use the Debates feature to discuss the classification with the community. Disagreements help the research team identify ambiguous cases and refine the criteria.',
  },
  {
    q: 'Does my classification affect the final dataset?',
    a: 'Yes. Each abstract is classified by multiple people, and the final label is derived from the consensus. Your contribution directly improves the quality of the dataset.',
  },
  {
    q: 'Do I need to be an expert to contribute?',
    a: 'No. You do not need to be a researcher or a citizen science expert to contribute. The platform is designed so that anyone can help classify abstracts by following the guidance provided. What matters most is reading carefully and applying the criteria consistently.',
  },
  {
    q: 'What if I get it wrong?',
    a: 'That is completely fine. Each abstract is reviewed by multiple people, so the goal is not individual perfection but collective consistency. Differences in classification help identify ambiguous cases, and the results are later analysed by the RIECS-Concept team as part of a broader review process.',
  },
  {
    q: 'Why is the same abstract shown to several people?',
    a: 'The same abstract is reviewed by several contributors to detect consensus, disagreement, and ambiguous cases. This improves reliability and helps the research team identify where the classification criteria may need further refinement.',
  },
  {
    q: 'What should I do if I am unsure between the two main categories?',
    a: "Apply the rule of thumb: what would the paper be about if you removed the CS dimension? If a substantive scientific finding about something else remains, it is Findings through CS. If what remains is a study of how CS works, who participates, or what effects it produces, it is Findings about CS. If the case still feels unclear, choose Not sure / Can't decide, leave a comment, or open a debate so others can discuss it. Uncertain cases are valuable because they help reveal where the boundaries between categories are less clear.",
  },
  {
    q: 'Can I select more than one dimension in Step 2?',
    a: 'Yes — and you are expected to, when relevant. Many papers about CS span more than one dimension (for example, a paper on a new platform that also analyses user motivations would touch Technology & Platforms and Participation & Engagement). Select all dimensions that the abstract substantively addresses.',
  },
  {
    q: 'How will these classifications be used?',
    a: 'The classifications contribute to a broader analysis of the peer-reviewed citizen science literature. Together with other inputs collected across RIECS-Concept, they help identify patterns, gaps, and needs that will inform the conceptual design of the future Research Infrastructure for Excellent Citizen Science.',
  },
  {
    q: 'Where do these abstracts come from?',
    a: "The corpus was compiled from bibliographic records identified through a systematic search of the Web of Science database, accessed via the Universidad de Zaragoza's institutional licence. The abstracts are publicly available from the original publication sources, which remain the authoritative reference for each record.",
  },
  {
    q: 'Do I need to register to classify abstracts?',
    a: 'Yes. Registration in the CitSci Sort platform is required in order to contribute classifications. It helps us keep track of contributions, improve the reliability of the analysis, and better understand patterns of agreement and disagreement across reviewers. No personal or confidential data will be used as part of the research analysis.',
  },
];

const FaqTab = () => (
  <>
    <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>FAQ</Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
      Frequently asked questions about classifying abstracts
    </Typography>
    <Divider sx={{ my: 4 }} />
    {FAQ_ITEMS.map((item, i) => (
      <Box key={i} sx={{ mb: 4 }}>
        <Typography variant="body1" fontWeight="bold" gutterBottom>{item.q}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>{item.a}</Typography>
      </Box>
    ))}
  </>
);

const About = () => {
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = TABS.includes(tabParam) ? tabParam : 'about';

  const handleTabChange = (_, newValue) => {
    setSearchParams({ tab: newValue });
  };

  return (
    <>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        {isAuthenticated && <SideMenu />}
        <Box component="main" sx={{ flexGrow: 1, minWidth: 0, mt: 0, p: { xs: 1.5, sm: 3 } }}>
          <Container maxWidth="lg" sx={{ mt: { xs: 7, sm: 4 }, mb: 4, wordBreak: 'break-word' }}>

            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ mb: 4, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="About" value="about" />
              <Tab label="FAQ" value="faq" />
              <Tab label="Terms of Use" value="terms" />
              <Tab label="Privacy Policy" value="privacy" />
            </Tabs>

            {activeTab === 'about' && <AboutTab isAuthenticated={isAuthenticated} />}
            {activeTab === 'faq' && <FaqTab />}
            {activeTab === 'terms' && <TermsTab isAuthenticated={isAuthenticated} />}
            {activeTab === 'privacy' && <PrivacyTab isAuthenticated={isAuthenticated} />}

          </Container>
        </Box>
      </Box>
    </>
  );
};

export default About;
