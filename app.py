import requests
from bson import json_util
from pymongo import MongoClient
from flask import Flask, request, render_template, Response

app = Flask(__name__, static_url_path='')

mongo = MongoClient("mongodb://mongo:27017/user_data")


@app.route('/')
def index():
    return render_template("index.html")


@app.route('/eum.js')
def static_file():
    return app.send_static_file('eum.js')


@app.route('/report', methods=['GET', 'POST'])
def report():
    stats = {}
    for stat in request.data.decode().split('\n'):
        key = stat.split('\t')[0]
        value = stat.split('\t')[1]
        stats[key] = value
    user_data = mongo.db.user_data
    user_data.insert(stats)
    return Response(f"Request received + added to MongoDB.", status=requests.codes.ok)


@app.route("/data", methods=['GET'])
def view_data():
    user_data = mongo.db.user_data
    cursor = user_data.find()
    return json_util.dumps(cursor, default=json_util.default)


if __name__ == '__main__':
    app.secret_key = 'secret123'
    app.run(debug=True, host='0.0.0.0')
