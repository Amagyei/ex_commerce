### Ex Commerce

 Ex- commerce is an intelligent automation system that connects your e-commerce platform with real-time customer engagement and product knowledge management. Built on Frappe, it combines chatbot workflows, product encyclopedia data, and sales insights to help businesses handle inquiries, track orders, and respond instantly across channels like WhatsApp or web chat.

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch develop
bench install-app ex_commerce
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/ex_commerce
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### License

mit
# ex_commerce
