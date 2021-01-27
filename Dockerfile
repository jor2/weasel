FROM python:3.6-alpine
WORKDIR /weasel
COPY requirements.txt /weasel
COPY app.py /weasel
COPY templates /weasel/templates
COPY static /weasel/static
RUN pip install -r requirements.txt
EXPOSE 5000
ENTRYPOINT ["python"]
CMD ["app.py"]