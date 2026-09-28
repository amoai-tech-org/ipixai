# User Journey Diagrams Reference

User journey diagrams illustrate the steps users take to complete tasks, with satisfaction scores for each step. Use for mapping user workflows, identifying pain points, and planning UX improvements.

## Basic Syntax

```mermaid
journey
    title My Working Day
    section Go to work
        Make tea: 5: Me
        Go upstairs: 3: Me
        Do work: 1: Me, Cat
    section Go home
        Go downstairs: 5: Me
        Sit down: 5: Me
```

## Structure

### Title
```
journey
    title Journey Title
```

### Sections
Divide the journey into logical phases:
```
section Phase Name
```

### Tasks
Each task follows this format:
```
Task name: <score>: <comma separated actors>
```

- **Task name** - description of the step
- **Score** - satisfaction rating from 1 (worst) to 5 (best)
- **Actors** - comma-separated list of participants involved

## Score Meanings

| Score | Meaning | Color |
|-------|---------|-------|
| 1 | Very negative / frustrated | Red |
| 2 | Negative / difficult | Orange |
| 3 | Neutral / acceptable | Yellow |
| 4 | Positive / good | Light green |
| 5 | Very positive / delighted | Green |

## Multiple Actors

Tasks can involve multiple actors to show collaboration or handoffs:

```mermaid
journey
    title Event Planning
    section Concept
        Define theme: 4: Sofia, Luca
        Set budget: 3: Sofia, Kai
    section Planning
        Book venue: 4: Amara
        Hire models: 3: Mia, Amara
        Plan shoot: 5: Daniel, Luca
    section Execution
        Setup venue: 3: Priya, Amara
        Run show: 5: Sofia, Amara, Priya
        Capture content: 5: Daniel
    section Follow-up
        Review media: 4: Luca, Daniel
        Send reports: 3: Sofia, Kai
```

## FashionOS Example: Fashion Show Journey

```mermaid
journey
    title Fashion Show Production Journey
    section Planning
        Create event brief: 5: Sofia
        Approve budget: 3: Kai
        Book venue: 4: Amara
    section Pre-Production
        Cast models: 4: Mia
        Plan looks: 5: Luca
        Schedule rehearsal: 3: Priya
    section Production Day
        Setup venue: 3: Amara, Priya
        Hair and makeup: 4: Mia
        Photography setup: 4: Daniel
        Run show: 5: Sofia, Amara
    section Post-Production
        Edit photos: 4: Daniel
        Review assets: 3: Luca
        Send to sponsors: 4: Kai
        Publish content: 5: Sofia
```

## Tips

1. **Use sections** to group related tasks into workflow phases
2. **Be honest with scores** - low scores highlight improvement opportunities
3. **Include all relevant actors** to show handoffs and collaboration points
4. **Keep task names concise** - 2-5 words per task
5. **Identify pain points** - steps with scores 1-2 are candidates for improvement
6. **Compare as-is vs to-be** - create two diagrams to show improvement plans

## Use Cases

- **UX research** - Map current user workflows and identify friction
- **Process improvement** - Visualize team workflows across phases
- **Stakeholder communication** - Show user experience across touchpoints
- **Sprint planning** - Identify which pain points to address first

## Reference

- [Official Documentation](https://mermaid.js.org/syntax/userJourney.html)
